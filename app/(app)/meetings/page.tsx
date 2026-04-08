import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getDb } from "@/db";
import { meetings } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VideoIcon, Upload, Clock } from "lucide-react";

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

export default async function MeetingsPage() {
  await auth();
  const db = getDb();
  const allMeetings = await db
    .select()
    .from(meetings)
    .orderBy(desc(meetings.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meetings</h1>
          <p className="text-zinc-400 mt-1 text-sm">
            {allMeetings.length} meeting{allMeetings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/upload">
          <Button className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
            <Upload className="h-4 w-4" />
            Upload Recording
          </Button>
        </Link>
      </div>

      {allMeetings.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <VideoIcon className="h-12 w-12 text-zinc-700" />
            <p className="text-zinc-300 font-medium">No meetings yet</p>
            <p className="text-zinc-500 text-sm">Upload a recording to get started</p>
            <Link href="/upload">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 mt-2">
                Upload your first recording
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {allMeetings.map((meeting) => (
            <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                <CardContent className="py-4 px-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-md bg-zinc-800 p-2 shrink-0">
                      <VideoIcon className="h-4 w-4 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{meeting.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="h-3 w-3 text-zinc-500" />
                        <span className="text-xs text-zinc-500">
                          {new Date(meeting.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[meeting.status]}`}
                  >
                    {STATUS_LABELS[meeting.status]}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
