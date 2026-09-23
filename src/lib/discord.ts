import { FeedbackType } from "@prisma/client";

type DiscordFeedbackPayload = {
  appName: string;
  type: FeedbackType;
  message: string;
  appVersion?: string | null;
  platform?: string | null;
  device?: string | null;
  language?: string | null;
  userId?: string | null;
  metadata?: unknown;
  createdAt: Date;
};

const TYPE_COLOR: Record<FeedbackType, number> = {
  bug: 0xe74c3c, // red
  feedback: 0x3498db, // blue
  feature: 0x2ecc71, // green
};

const TYPE_LABEL: Record<FeedbackType, string> = {
  bug: "🐛 Bug Report",
  feedback: "💬 Feedback",
  feature: "✨ Feature Request",
};

function buildEmbed(payload: DiscordFeedbackPayload) {
  const fields: { name: string; value: string; inline?: boolean }[] = [];

  if (payload.appVersion) fields.push({ name: "App Version", value: payload.appVersion, inline: true });
  if (payload.platform) fields.push({ name: "Platform", value: payload.platform, inline: true });
  if (payload.device) fields.push({ name: "Device", value: payload.device, inline: true });
  if (payload.language) fields.push({ name: "Language", value: payload.language, inline: true });
  if (payload.userId) fields.push({ name: "User ID", value: payload.userId, inline: true });

  if (payload.metadata && Object.keys(payload.metadata as object).length > 0) {
    const json = JSON.stringify(payload.metadata, null, 2);
    fields.push({
      name: "Metadata",
      value: "```json\n" + json.slice(0, 900) + (json.length > 900 ? "\n... (truncated)" : "") + "\n```",
    });
  }

  return {
    embeds: [
      {
        title: TYPE_LABEL[payload.type],
        description: payload.message.slice(0, 4000),
        color: TYPE_COLOR[payload.type],
        fields,
        author: { name: payload.appName },
        timestamp: payload.createdAt.toISOString(),
        footer: { text: "Universal Product Feedback" },
      },
    ],
  };
}

/**
 * Sends a feedback item to the given Discord webhook URL.
 * Returns { ok: true } on success, or { ok: false, error } on failure.
 * Never throws — callers should still persist feedback even if this fails.
 */
export async function sendFeedbackToDiscord(
  webhookUrl: string,
  payload: DiscordFeedbackPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildEmbed(payload)),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Discord responded ${res.status}: ${text.slice(0, 300)}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error sending to Discord" };
  }
}
