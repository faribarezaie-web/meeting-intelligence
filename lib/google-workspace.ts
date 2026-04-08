import { google } from "googleapis";
import { getDb } from "@/db";
import { employees } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function syncGoogleWorkspaceEmployees() {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");

  const credentials = JSON.parse(serviceAccountJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/admin.directory.user.readonly"],
    clientOptions: {
      subject: process.env.GOOGLE_ADMIN_EMAIL!,
    },
  });

  const admin = google.admin({ version: "directory_v1", auth });

  const response = await admin.users.list({
    customer: "my_customer",
    maxResults: 500,
    orderBy: "email",
  });

  const users = response.data.users ?? [];
  if (users.length === 0) return { synced: 0 };

  const db = getDb();

  const values = users
    .filter((u) => u.id && u.primaryEmail)
    .map((user) => ({
      googleId: user.id!,
      name: user.name?.fullName ?? "",
      email: user.primaryEmail!,
      role: user.organizations?.[0]?.title ?? null,
      department: user.organizations?.[0]?.department ?? null,
      expertise: [] as string[],
      syncedAt: new Date(),
    }));

  await db
    .insert(employees)
    .values(values)
    .onConflictDoUpdate({
      target: employees.googleId,
      set: {
        name: sql`excluded.name`,
        email: sql`excluded.email`,
        role: sql`excluded.role`,
        department: sql`excluded.department`,
        syncedAt: sql`excluded.synced_at`,
      },
    });

  return { synced: values.length };
}
