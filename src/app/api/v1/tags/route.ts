import { NextResponse } from "next/server";

import { withApiHandler } from "@/lib/api/handler";
import { listUserTags } from "@/lib/api/entries-repo";

export const runtime = "nodejs";

export const GET = withApiHandler(async (_req, { user }) => {
  const tags = await listUserTags(user.userId);
  return NextResponse.json({ tags });
});
