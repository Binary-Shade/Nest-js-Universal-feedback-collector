import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { feedbackInputSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/ratelimit";
import { sendFeedbackToDiscord } from "@/lib/discord";

export const runtime = "nodejs";

const DEFAULT_WEBHOOKS: Record<string, string | undefined> = {
  bug: process.env.DISCORD_BUG_WEBHOOK_URL,
  feedback: process.env.DISCORD_FEEDBACK_WEBHOOK_URL,
  feature: process.env.DISCORD_FEATURE_WEBHOOK_URL,
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Missing X-API-Key header" }, { status: 401 });
    }

    const app = await prisma.app.findUnique({ where: { apiKey } });
    if (!app) {
      return NextResponse.json({ success: false, error: "Invalid API key" }, { status: 401 });
    }
    if (app.disabled) {
      return NextResponse.json({ success: false, error: "This app's API key has been disabled" }, { status: 403 });
    }

    const limitPerMinute = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 10);
    const rl = checkRateLimit(apiKey, limitPerMinute);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(limitPerMinute),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
          },
        }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = feedbackInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Save feedback first so it's never lost even if Discord delivery fails.
    const feedback = await prisma.feedback.create({
      data: {
        appId: app.id,
        type: data.type,
        message: data.message,
        appVersion: data.appVersion,
        platform: data.platform,
        device: data.device,
        language: data.language,
        userId: data.userId,
        metadata: data.metadata ?? undefined,
      },
    });

    // Resolve webhook: per-app configured webhook takes priority, then env default.
    const webhook = await prisma.webhook.findUnique({
      where: { appId_type: { appId: app.id, type: data.type } },
    });
    const webhookUrl = webhook?.url ?? DEFAULT_WEBHOOKS[data.type];

    if (webhookUrl) {
      const result = await sendFeedbackToDiscord(webhookUrl, {
        appName: app.name,
        type: data.type,
        message: data.message,
        appVersion: data.appVersion,
        platform: data.platform,
        device: data.device,
        language: data.language,
        userId: data.userId,
        metadata: data.metadata,
        createdAt: feedback.createdAt,
      });

      await prisma.feedback.update({
        where: { id: feedback.id },
        data: {
          discordDelivered: result.ok,
          discordError: result.ok ? null : result.error,
        },
      });
    } else {
      await prisma.feedback.update({
        where: { id: feedback.id },
        data: { discordDelivered: false, discordError: "No webhook configured for this feedback type" },
      });
    }

    return NextResponse.json({ success: true, message: "Feedback received" }, { status: 201 });
  } catch (err) {
    console.error("POST /api/v1/feedback error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
