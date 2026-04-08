import { auth, currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { tasks, meetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, VideoIcon, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { TaskStatusToggle } from "@/components/task-status-toggle";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-700 text-zinc-300",
  medium: "bg-blue-900 text-blue-300",
  high: "bg-orange-900 text-orange-300",
};

const COLUMNS: Array<{ status: string; label: string; color: string }> = [
  { status: "todo", label: "To Do", color: "text-zinc-400" },
  { status: "in_progress", label: "In Progress", color: "text-yellow-400" },
  { status: "completed", label: "Completed", color: "text-emerald-400" },
];

export default async function TasksPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  if (!userEmail) {
    return (
      <div className="text-center py-16 text-zinc-400">
        Could not determine your email address. Please update your profile.
      </div>
    );
  }

  const db = getDb();
  const myTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      meetingId: tasks.meetingId,
      meetingTitle: meetings.title,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .leftJoin(meetings, eq(tasks.meetingId, meetings.id))
    .where(eq(tasks.assignedToEmail, userEmail));

  const grouped = COLUMNS.reduce(
    (acc, col) => {
      acc[col.status] = myTasks.filter((t) => t.status === col.status);
      return acc;
    },
    {} as Record<string, typeof myTasks>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-zinc-400 mt-1 text-sm">
          Tasks assigned to {userEmail} · {myTasks.length} total
        </p>
      </div>

      {myTasks.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <CheckSquare className="h-12 w-12 text-zinc-700" />
            <p className="text-zinc-300 font-medium">No tasks assigned to you yet</p>
            <p className="text-zinc-500 text-sm">
              Tasks will appear here once a meeting is processed and tasks are assigned to your email
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = grouped[col.status] ?? [];
            return (
              <div key={col.status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className={`text-sm font-semibold ${col.color}`}>
                    {col.label}
                  </h2>
                  <span className="text-xs text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5">
                    {colTasks.length}
                  </span>
                </div>

                {colTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-800 py-8 flex items-center justify-center">
                    <p className="text-xs text-zinc-600">Empty</p>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <Card
                      key={task.id}
                      className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      <CardContent className="py-3 px-4 space-y-2">
                        <p className="text-sm font-medium leading-snug">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}
                          >
                            {task.priority}
                          </span>
                          <TaskStatusToggle taskId={task.id} currentStatus={task.status} />
                        </div>
                        {task.meetingTitle && (
                          <Link
                            href={`/meetings/${task.meetingId}`}
                            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            <VideoIcon className="h-3 w-3" />
                            <span className="truncate">{task.meetingTitle}</span>
                            <ArrowRight className="h-3 w-3 shrink-0" />
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
