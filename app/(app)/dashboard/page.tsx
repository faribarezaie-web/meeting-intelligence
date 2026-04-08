import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getDb } from "@/db";
import { meetings, tasks } from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VideoIcon, CheckSquare, Clock, Upload, ArrowRight } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-zinc-700 text-zinc-300",
  fetching_audio: "bg-blue-900 text-blue-300",
  transcribing: "bg-blue-900 text-blue-300",
  summarizing: "bg-yellow-900 text-yellow-300",
  extracting_tasks: "bg-yellow-900 text-yellow-300",
  assigning_tasks: "bg-orange-900 text-orange-300",
  completed: "bg-emerald-900 text-emerald-300",
  failed: "bg-red-900 text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  fetching_audio: "Fetching audio",
  transcribing: "Transcribing",
  summarizing: "Summarizing",
  extracting_tasks: "Extracting tasks",
  assigning_tasks: "Assigning tasks",
  completed: "Completed",
  failed: "Failed",
};

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const db = getDb();

  const [totalMeetings, completedMeetings, recentMeetings] = await Promise.all([
    db.select({ count: count() }).from(meetings).where(eq(meetings.createdBy, userId)),
    db.select({ count: count() }).from(meetings).where(eq(meetings.status, "completed")),
    db.select().from(meetings).orderBy(desc(meetings.createdAt)).limit(5),
  ]);

  const totalMeetingCount = totalMeetings[0]?.count ?? 0;
  const completedCount = completedMeetings[0]?.count ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-zinc-400 mt-1 text-sm">Overview of your meeting intelligence workspace</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
              Total Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <VideoIcon className="h-5 w-5 text-violet-400" />
              <span className="text-3xl font-bold">{totalMeetingCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
              Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-emerald-400" />
              <span className="text-3xl font-bold">{completedCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-400" />
              <span className="text-3xl font-bold">
                {totalMeetingCount - completedCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick action */}
      <div>
        <Link href="/upload">
          <Button className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
            <Upload className="h-4 w-4" />
            Upload New Recording
          </Button>
        </Link>
      </div>

      {/* Recent meetings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Meetings</h2>
          <Link href="/meetings" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentMeetings.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-12 flex flex-col items-center text-center gap-3">
              <VideoIcon className="h-10 w-10 text-zinc-700" />
              <p className="text-zinc-400">No meetings yet</p>
              <Link href="/upload">
                <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  Upload your first recording
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentMeetings.map((meeting) => (
              <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <VideoIcon className="h-4 w-4 text-zinc-500 shrink-0" />
                      <span className="text-sm font-medium truncate">{meeting.title}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-xs text-zinc-500">
                        {new Date(meeting.createdAt).toLocaleDateString()}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[meeting.status]}`}
                      >
                        {STATUS_LABELS[meeting.status]}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
