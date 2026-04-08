import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { meetings, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
  if (!meeting) return Response.json({ error: "Not found" }, { status: 404 });

  const meetingTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.meetingId, id));

  return Response.json({ ...meeting, tasks: meetingTasks });
}
