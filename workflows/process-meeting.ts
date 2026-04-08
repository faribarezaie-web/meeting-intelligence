import { FatalError } from "workflow";
import { getDb } from "@/db";
import { meetings, tasks, employees } from "@/db/schema";
import { eq } from "drizzle-orm";

// ─── Step 1: Fetch audio ───────────────────────────────────────────────────

async function fetchAudioStep(meetingId: string): Promise<{
  audioBuffer: ArrayBuffer;
  mimeType: string;
}> {
  "use step";

  console.log(`[fetchAudioStep] Starting for meeting ${meetingId}`);
  const db = getDb();
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));

  if (!meeting) throw new FatalError(`Meeting ${meetingId} not found`);

  await db
    .update(meetings)
    .set({ status: "fetching_audio", updatedAt: new Date() })
    .where(eq(meetings.id, meetingId));

  if (meeting.youtubeUrl) {
    console.log(`[fetchAudioStep] Downloading YouTube audio: ${meeting.youtubeUrl}`);
    const ytdl = await import("ytdl-core");
    const stream = ytdl.default(meeting.youtubeUrl, {
      filter: "audioonly",
      quality: "highestaudio",
    });

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBufferLike));
    }
    const buffer = Buffer.concat(chunks);
    console.log(`[fetchAudioStep] YouTube audio downloaded: ${buffer.length} bytes`);
    return {
      audioBuffer: buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer,
      mimeType: "audio/webm",
    };
  }

  if (meeting.blobUrl) {
    console.log(`[fetchAudioStep] Downloading from Blob: ${meeting.blobUrl}`);
    const { get } = await import("@vercel/blob");
    const blobResult = await get(meeting.blobUrl, { access: "private" });
    if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
      throw new FatalError("Blob not found or empty");
    }
    const reader = blobResult.stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const total = chunks.reduce((n, c) => n + c.byteLength, 0);
    const combined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength; }
    const mimeType = blobResult.blob.contentType ?? "audio/mpeg";
    console.log(`[fetchAudioStep] Blob downloaded: ${combined.byteLength} bytes`);
    return { audioBuffer: combined.buffer as ArrayBuffer, mimeType };
  }

  throw new FatalError("Meeting has no audio source");
}

// ─── Step 2: Transcribe audio ──────────────────────────────────────────────

async function transcribeAudioStep(
  meetingId: string,
  audioBuffer: ArrayBuffer,
  mimeType: string
): Promise<string> {
  "use step";

  console.log(`[transcribeAudioStep] Starting transcription for meeting ${meetingId}`);
  const db = getDb();
  await db
    .update(meetings)
    .set({ status: "transcribing", updatedAt: new Date() })
    .where(eq(meetings.id, meetingId));

  const { experimental_transcribe: transcribe } = await import("ai");
  // Whisper transcription uses the default openai instance (reads env automatically).
  // Audio transcription is not supported by AI Gateway — direct provider required.
  const { openai } = await import("@ai-sdk/openai");

  const result = await transcribe({
    model: openai.transcription("whisper-1"),
    audio: audioBuffer,
  });

  console.log(`[transcribeAudioStep] Transcription complete: ${result.text.length} chars`);
  return result.text;
}

// ─── Step 3: Generate summary ──────────────────────────────────────────────

async function generateSummaryStep(
  meetingId: string,
  transcript: string
): Promise<string> {
  "use step";

  console.log(`[generateSummaryStep] Summarizing meeting ${meetingId}`);
  const db = getDb();
  await db
    .update(meetings)
    .set({ status: "summarizing", updatedAt: new Date() })
    .where(eq(meetings.id, meetingId));

  const { generateText, Output } = await import("ai");

  const { z } = await import("zod");
  const summaryResult = await generateText({
    model: "anthropic/claude-sonnet-4.6" as any,
    output: Output.object({
      schema: z.object({
        bullets: z.array(z.string()),
        overview: z.string(),
      }),
    }),
    system:
      "You are a meeting intelligence assistant. Produce concise, professional meeting summaries.",
    prompt: `Summarize this meeting transcript. Provide an overview (1-2 sentences) and 3-5 bullet points covering key decisions, action items, and outcomes.\n\nTranscript:\n${transcript.slice(0, 12000)}`,
  });

  const summary = summaryResult.output;
  const formatted = `${summary.overview}\n\n${summary.bullets.map((b: string) => `• ${b}`).join("\n")}`;
  console.log(`[generateSummaryStep] Summary generated`);
  return formatted;
}

// ─── Step 4: Extract tasks ─────────────────────────────────────────────────

interface ExtractedTask {
  title: string;
  description: string;
  suggestedAssigneeKeywords: string[];
  priority: "low" | "medium" | "high";
}

async function extractTasksStep(
  meetingId: string,
  transcript: string
): Promise<ExtractedTask[]> {
  "use step";

  console.log(`[extractTasksStep] Extracting tasks for meeting ${meetingId}`);
  const db = getDb();
  await db
    .update(meetings)
    .set({ status: "extracting_tasks", updatedAt: new Date() })
    .where(eq(meetings.id, meetingId));

  const { generateText, Output } = await import("ai");
  const { z } = await import("zod");

  const extractResult = await generateText({
    model: "anthropic/claude-sonnet-4.6" as any,
    output: Output.object({
      schema: z.object({
        tasks: z.array(
          z.object({
            title: z.string().describe("Short, actionable task title"),
            description: z.string().describe("What needs to be done"),
            suggestedAssigneeKeywords: z
              .array(z.string())
              .describe(
                "Keywords for expertise needed e.g. 'frontend', 'design', 'security', 'backend', 'data'"
              ),
            priority: z.enum(["low", "medium", "high"]),
          })
        ),
      }),
    }),
    system:
      "Extract all concrete action items and tasks from this meeting transcript. For each task, identify keywords describing the expertise required.",
    prompt: `Extract tasks from this meeting transcript:\n\n${transcript.slice(0, 12000)}`,
  });

  console.log(`[extractTasksStep] Extracted ${extractResult.output.tasks.length} tasks`);
  return extractResult.output.tasks;
}

// ─── Step 5: Assign tasks to employees ────────────────────────────────────

async function assignTasksStep(
  meetingId: string,
  extractedTasks: ExtractedTask[]
): Promise<void> {
  "use step";

  console.log(`[assignTasksStep] Assigning ${extractedTasks.length} tasks for meeting ${meetingId}`);
  const db = getDb();
  await db
    .update(meetings)
    .set({ status: "assigning_tasks", updatedAt: new Date() })
    .where(eq(meetings.id, meetingId));

  const allEmployees = await db.select().from(employees);
  console.log(`[assignTasksStep] ${allEmployees.length} employees in directory`);

  if (extractedTasks.length === 0) return;

  const taskInserts = extractedTasks.map((task) => {
    const keywords = task.suggestedAssigneeKeywords.map((k) => k.toLowerCase());

    let bestEmployee: (typeof allEmployees)[0] | null = null;
    let bestScore = -1;

    for (const emp of allEmployees) {
      const empExpertise = ((emp.expertise as string[]) ?? []).map((e) =>
        e.toLowerCase()
      );
      const roleTokens = (emp.role ?? "").toLowerCase().split(/[\s,/]+/);

      const score = keywords.reduce((acc, keyword) => {
        const inExpertise = empExpertise.some(
          (e) => e.includes(keyword) || keyword.includes(e)
        );
        const inRole = roleTokens.some(
          (r) => r.length > 2 && (r.includes(keyword) || keyword.includes(r))
        );
        return acc + (inExpertise ? 2 : 0) + (inRole ? 1 : 0);
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestEmployee = emp;
      }
    }

    const assignedEmail = bestScore > 0 ? (bestEmployee?.email ?? null) : null;
    console.log(`[assignTasksStep] "${task.title}" → ${assignedEmail ?? "unassigned"} (score: ${bestScore})`);

    return {
      meetingId,
      title: task.title,
      description: task.description,
      assignedToEmail: assignedEmail,
      priority: task.priority,
      status: "todo" as const,
    };
  });

  await db.insert(tasks).values(taskInserts);
  console.log(`[assignTasksStep] Tasks inserted`);
}

// ─── Step 6: Finalize meeting ──────────────────────────────────────────────

async function finalizeMeetingStep(
  meetingId: string,
  transcript: string,
  summary: string
): Promise<void> {
  "use step";

  console.log(`[finalizeMeetingStep] Completing meeting ${meetingId}`);
  const db = getDb();
  await db
    .update(meetings)
    .set({
      status: "completed",
      transcript,
      summary,
      updatedAt: new Date(),
    })
    .where(eq(meetings.id, meetingId));
  console.log(`[finalizeMeetingStep] Meeting ${meetingId} marked completed`);
}

// ─── Error handler step ───────────────────────────────────────────────────

async function markFailedStep(meetingId: string): Promise<void> {
  "use step";
  const db = getDb();
  await db
    .update(meetings)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(meetings.id, meetingId));
}

// ─── Workflow orchestrator ─────────────────────────────────────────────────

export async function processMeetingWorkflow(meetingId: string): Promise<void> {
  "use workflow";

  console.log(`[processMeetingWorkflow] Starting for meeting ${meetingId}`);

  try {
    const { audioBuffer, mimeType } = await fetchAudioStep(meetingId);
    const transcript = await transcribeAudioStep(meetingId, audioBuffer, mimeType);

    // Run summarization and task extraction in parallel
    const [summary, extractedTasks] = await Promise.all([
      generateSummaryStep(meetingId, transcript),
      extractTasksStep(meetingId, transcript),
    ]);

    await assignTasksStep(meetingId, extractedTasks);
    await finalizeMeetingStep(meetingId, transcript, summary);

    console.log(`[processMeetingWorkflow] Completed for meeting ${meetingId}`);
  } catch (err) {
    console.error(`[processMeetingWorkflow] Failed for meeting ${meetingId}:`, err);
    await markFailedStep(meetingId);
    throw err;
  }
}
