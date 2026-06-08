import { NextResponse } from "next/server";

import { withApiHandler } from "@/lib/api/handler";
import { deleteConversation, getConversation, listMessages } from "@/lib/api/chat-repo";

export const runtime = "nodejs";

export const GET = withApiHandler<{ id: string }>(async (_req, { user, params }) => {
  const conversation = await getConversation(user.userId, params.id);
  const messages = await listMessages(conversation.id);
  return NextResponse.json({ conversation, messages });
});

export const DELETE = withApiHandler<{ id: string }>(async (_req, { user, params }) => {
  await deleteConversation(user.userId, params.id);
  return NextResponse.json({ deleted: true });
});
