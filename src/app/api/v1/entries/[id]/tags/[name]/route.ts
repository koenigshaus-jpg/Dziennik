import { NextResponse } from "next/server";

import { withApiHandler } from "@/lib/api/handler";
import { detachTag } from "@/lib/api/entries-repo";

export const runtime = "nodejs";

export const DELETE = withApiHandler<{ id: string; name: string }>(
  async (_req, { user, params }) => {
    const entry = await detachTag(user.userId, params.id, decodeURIComponent(params.name));
    return NextResponse.json(entry);
  }
);
