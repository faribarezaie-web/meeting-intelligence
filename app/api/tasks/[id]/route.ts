import { auth, currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdmin } from "@/lib/clerk";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await request.json();

  const validStatuses = ["todo", "in_progress", "completed"];
  if (!validStatuses.includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = getDb();

  // Admins can update any task; employees can only update tasks assigned to them
  const admin = await isAdmin(userId);
  if (admin) {
    const [updated] = await db
      .update(tasks)
      .set({ status, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    if (!updated) return Response.json({ error: "Task not found" }, { status: 404 });
    return Response.json(updated);
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  if (!userEmail) return Response.json({ error: "No email on account" }, { status: 400 });

  const [updated] = await db
    .update(tasks)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.assignedToEmail, userEmail)))
    .returning();

  if (!updated) {
    return Response.json({ error: "Task not found or not assigned to you" }, { status: 404 });
  }

  return Response.json(updated);
}
