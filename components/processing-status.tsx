"use client";

import { useEffect, useState } from "react";

type MeetingStatus =
  | "pending"
  | "fetching_audio"
  | "transcribing"
  | "summarizing"
  | "extracting_tasks"
  | "assigning_tasks"
  | "completed"
  | "failed";

const STATUS_LABELS: Record<MeetingStatus, string> = {
  pending: "Queued for processing...",
  fetching_audio: "Fetching audio...",
  transcribing: "Transcribing with Whisper...",
  summarizing: "Generating summary...",
  extracting_tasks: "Extracting action items...",
  assigning_tasks: "Assigning tasks to team members...",
  completed: "Processing complete",
  failed: "Processing failed",
};

const PROGRESS: Record<MeetingStatus, number> = {
  pending: 5,
  fetching_audio: 15,
  transcribing: 35,
  summarizing: 60,
  extracting_tasks: 75,
  assigning_tasks: 90,
  completed: 100,
  failed: 0,
};

export function ProcessingStatus({
  meetingId,
  initialStatus,
}: {
  meetingId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState<MeetingStatus>(initialStatus as MeetingStatus);

  useEffect(() => {
    if (status === "completed" || status === "failed") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}`);
        if (!res.ok) return;
        const data = await res.json();
        const newStatus = data.status as MeetingStatus;
        setStatus(newStatus);
        if (newStatus === "completed") {
          // Reload page to show the completed meeting content
          window.location.reload();
        }
      } catch {
        // silently ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [meetingId, status]);

  const progress = PROGRESS[status];

  return (
    <div className="space-y-2 w-full">
      <p className="text-sm text-zinc-300">{STATUS_LABELS[status]}</p>
      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-violet-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
