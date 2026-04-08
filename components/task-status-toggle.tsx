"use client";

import { useState } from "react";
import { toast } from "sonner";

type TaskStatus = "todo" | "in_progress" | "completed";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  completed: "Done",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
  in_progress: "bg-yellow-900/60 text-yellow-300 hover:bg-yellow-900",
  completed: "bg-emerald-900/60 text-emerald-300 hover:bg-emerald-900",
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress",
  in_progress: "completed",
  completed: "todo",
};

export function TaskStatusToggle({
  taskId,
  currentStatus,
}: {
  taskId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState<TaskStatus>(currentStatus as TaskStatus);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = NEXT_STATUS[status];
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Update failed");
      setStatus(next);
      toast.success(`Task marked as ${STATUS_LABELS[next]}`);
    } catch {
      toast.error("Failed to update task status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 ${STATUS_STYLES[status]} disabled:opacity-50`}
    >
      {STATUS_LABELS[status]}
    </button>
  );
}
