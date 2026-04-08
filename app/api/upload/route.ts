import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { start } from "workflow/api";
import { getDb } from "@/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { processMeetingWorkflow } from "@/workflows/process-meeting";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const youtubeUrl = formData.get("youtubeUrl") as string | null;
  const title = (formData.get("title") as string) || "Untitled Meeting";

  if (!file && !youtubeUrl) {
    return Response.json({ error: "Provide a file or YouTube URL" }, { status: 400 });
  }

  const db = getDb();
  let blobUrl: string | null = null;

  if (file) {
    const blob = await put(
      `audio/${userId}/${Date.now()}-${file.name}`,
      file,
      { access: "private" }
    );
    blobUrl = blob.url;
  }

  const [meeting] = await db
    .insert(meetings)
    .values({
      title,
      status: "pending",
      blobUrl,
      youtubeUrl: youtubeUrl ?? undefined,
      createdBy: userId,
    })
    .returning();

  const run = await start(processMeetingWorkflow, [meeting.id]);

  await db
    .update(meetings)
    .set({ workflowRunId: run.runId })
    .where(eq(meetings.id, meeting.id));

  return Response.json({ meetingId: meeting.id, runId: run.runId });
}
