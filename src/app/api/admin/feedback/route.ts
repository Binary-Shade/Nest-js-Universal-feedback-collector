import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/auth";
import { FeedbackType } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const appId = searchParams.get("appId") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const cursor = searchParams.get("cursor") ?? undefined;

  const feedback = await prisma.feedback.findMany({
    where: {
      appId,
      type: type && Object.values(FeedbackType).includes(type as FeedbackType) ? (type as FeedbackType) : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: { app: { select: { name: true } } },
  });

  return NextResponse.json({
    success: true,
    feedback,
    nextCursor: feedback.length === limit ? feedback[feedback.length - 1].id : null,
  });
}
