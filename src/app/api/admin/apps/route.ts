import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/auth";
import { createAppSchema } from "@/lib/validation";
import { generateApiKey, last4 } from "@/lib/apikey";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const apps = await prisma.app.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      webhooks: true,
      _count: { select: { feedback: true } },
    },
  });

  const safeApps = apps.map((app) => ({
    id: app.id,
    name: app.name,
    apiKeyMasked: `fb_${"*".repeat(8)}${app.apiKeyLast4}`,
    disabled: app.disabled,
    createdAt: app.createdAt,
    webhooks: app.webhooks.map((w) => ({ type: w.type, url: w.url })),
    feedbackCount: app._count.feedback,
  }));

  return NextResponse.json({ success: true, apps: safeApps });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createAppSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const apiKey = generateApiKey();

  const app = await prisma.app.create({
    data: {
      name: parsed.data.name,
      apiKey,
      apiKeyLast4: last4(apiKey),
    },
  });

  // Full API key is only ever returned once, at creation time.
  return NextResponse.json(
    {
      success: true,
      app: { id: app.id, name: app.name, apiKey, disabled: app.disabled, createdAt: app.createdAt },
    },
    { status: 201 }
  );
}
