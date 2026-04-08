import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { meetings, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoIcon, FileText, CheckSquare, Users, AlertCircle, Loader2 } from "lucide-react";
import { ProcessingStatus } from "@/components/processing-status";
import { TaskStatusToggle } from "@/components/task-status-toggle";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-700 text-zinc-300",
  medium: "bg-blue-900 text-blue-300",
  high: "bg-orange-900 text-orange-300",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: "bg-zinc-700 text-zinc-300",
  in_progress: "bg-yellow-900 text-yellow-300",
  completed: "bg-emerald-900 text-emerald-300",
};

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await auth();
  const { id } = await params;
  const db = getDb();

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, id));

  if (!meeting) notFound();

  const meetingTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.meetingId, id));

  const isProcessing = !["completed", "failed"].includes(meeting.status);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <VideoIcon className="h-5 w-5 text-violet-400" />
            <h1 className="text-2xl font-bold tracking-tight">{meeting.title}</h1>
          </div>
          <p className="text-zinc-400 text-sm">
            {new Date(meeting.createdAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Processing status bar */}
      {isProcessing && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 text-violet-400 animate-spin shrink-0" />
              <div className="flex-1">
                <ProcessingStatus meetingId={meeting.id} initialStatus={meeting.status} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed state */}
      {meeting.status === "failed" && (
        <Card className="bg-red-950/30 border-red-900">
          <CardContent className="py-4 px-5 flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">
              Processing failed. Please try uploading the recording again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Content tabs */}
      {meeting.status === "completed" && (
        <Tabs defaultValue="summary">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="summary" className="gap-2 data-[state=active]:bg-zinc-800">
              <FileText className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2 data-[state=active]:bg-zinc-800">
              <CheckSquare className="h-4 w-4" />
              Tasks ({meetingTasks.length})
            </TabsTrigger>
            <TabsTrigger value="transcript" className="gap-2 data-[state=active]:bg-zinc-800">
              <FileText className="h-4 w-4" />
              Transcript
            </TabsTrigger>
          </TabsList>

          {/* Summary tab */}
          <TabsContent value="summary" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Meeting Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {meeting.summary ? (
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {meeting.summary}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">No summary available.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks tab */}
          <TabsContent value="tasks" className="mt-4 space-y-3">
            {meetingTasks.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-10 flex flex-col items-center text-center gap-2">
                  <CheckSquare className="h-8 w-8 text-zinc-700" />
                  <p className="text-zinc-400 text-sm">No tasks were extracted from this meeting</p>
                </CardContent>
              </Card>
            ) : (
              meetingTasks.map((task) => (
                <Card key={task.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{task.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                        {task.assignedToEmail && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <Users className="h-3 w-3 text-zinc-500" />
                            <span className="text-xs text-zinc-400">{task.assignedToEmail}</span>
                          </div>
                        )}
                      </div>
                      <TaskStatusToggle taskId={task.id} currentStatus={task.status} />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Transcript tab */}
          <TabsContent value="transcript" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Full Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                {meeting.transcript ? (
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono text-xs max-h-[600px] overflow-y-auto">
                    {meeting.transcript}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">No transcript available.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
