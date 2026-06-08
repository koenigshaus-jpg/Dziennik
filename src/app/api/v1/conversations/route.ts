import { NextResponse } from "next/server";

import { withApiHandler } from "@/lib/api/handler";
import { listConversations } from "@/lib/api/chat-repo";

export const runtime = "nodejs";

export const GET = withApiHandler(async (req, { user }) => {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10) || 50;
  const conversations = await listConversations(user.userId, limit);
  return NextResponse.json({ conversations });
});
