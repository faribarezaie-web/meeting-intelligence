import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/clerk";
import { syncGoogleWorkspaceEmployees } from "@/lib/google-workspace";

export async function POST() {
  const { userId } = await auth();
  if (!userId || !(await isAdmin(userId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await syncGoogleWorkspaceEmployees();
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
