import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { tasks, meetings, employees } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { CheckSquare, VideoIcon, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { TaskStatusToggle } from "@/components/task-status-toggle";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-700 text-zinc-300",
  medium: "bg-blue-900 text-blue-300",
  high: "bg-orange-900 text-orange-300",
};

export default async function AdminTasksPage() {
  await auth();
  const db = getDb();

  const allTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assignedToEmail: tasks.assignedToEmail,
      meetingId: tasks.meetingId,
      meetingTitle: meetings.title,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .leftJoin(meetings, eq(tasks.meetingId, meetings.id))
    .orderBy(desc(tasks.createdAt));

  const unassigned = allTasks.filter((t) => !t.assignedToEmail);
  const assigned = allTasks.filter((t) => t.assignedToEmail);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Tasks</h1>
        <p className="text-zinc-400 mt-1 text-sm">
          {allTasks.length} tasks · {unassigned.length} unassigned
        </p>
      </div>

      {allTasks.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <CheckSquare className="h-12 w-12 text-zinc-700" />
            <p className="text-zinc-400">No tasks yet. Process a meeting to extract tasks.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {unassigned.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-orange-400 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Unassigned ({unassigned.length})
              </h2>
              {unassigned.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-400">
              Assigned ({assigned.length})
            </h2>
            {assigned.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
}: {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assignedToEmail: string | null;
    meetingId: string;
    meetingTitle: string | null;
    createdAt: Date;
  };
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="py-3 px-5 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{task.title}</p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}
            >
              {task.priority}
            </span>
          </div>
          {task.description && (
            <p className="text-xs text-zinc-500 line-clamp-1">{task.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            {task.assignedToEmail ? (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {task.assignedToEmail}
              </span>
            ) : (
              <span className="text-orange-500">Unassigned</span>
            )}
            {task.meetingTitle && (
              <Link
                href={`/meetings/${task.meetingId}`}
                className="flex items-center gap-1 hover:text-zinc-300 transition-colors"
              >
                <VideoIcon className="h-3 w-3" />
                {task.meetingTitle}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
        <TaskStatusToggle taskId={task.id} currentStatus={task.status} />
      </CardContent>
    </Card>
  );
}
