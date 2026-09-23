import { z } from "zod";

export const feedbackTypeSchema = z.enum(["bug", "feedback", "feature"]);

export const feedbackInputSchema = z.object({
  type: feedbackTypeSchema,
  message: z.string().min(1, "message is required").max(4000),
  appVersion: z.string().max(100).optional(),
  platform: z.string().max(100).optional(),
  device: z.string().max(200).optional(),
  language: z.string().max(50).optional(),
  userId: z.string().max(200).optional(),
  metadata: z.record(z.any()).optional(),
});

export const createAppSchema = z.object({
  name: z.string().min(1).max(200),
});

export const configureWebhookSchema = z.object({
  appId: z.string().min(1),
  type: feedbackTypeSchema,
  url: z.string().url("url must be a valid URL").refine(
    (u) => u.startsWith("https://discord.com/api/webhooks/") || u.startsWith("https://discordapp.com/api/webhooks/"),
    "url must be a Discord webhook URL"
  ),
});
