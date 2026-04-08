import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/clerk";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId || !(await isAdmin(userId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const db = getDb();
  const [updated] = await db
    .update(employees)
    .set({ expertise: body.expertise })
    .where(eq(employees.id, id))
    .returning();

  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(updated);
}
