import { clerkClient } from "@clerk/nextjs/server";

export async function isAdmin(userId: string): Promise<boolean> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return (user.publicMetadata as { role?: string })?.role === "admin";
}
