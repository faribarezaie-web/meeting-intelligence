import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { employees } from "@/db/schema";
import { asc } from "drizzle-orm";
import { isAdmin } from "@/lib/clerk";

export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await isAdmin(userId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const all = await db.select().from(employees).orderBy(asc(employees.name));
  return Response.json(all);
}
