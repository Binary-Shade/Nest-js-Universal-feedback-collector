"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type AppRow = {
  id: string;
  name: string;
  apiKeyMasked: string;
  disabled: boolean;
  createdAt: string;
  webhooks: { type: string; url: string }[];
  feedbackCount: number;
};

type FeedbackRow = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  discordDelivered: boolean;
  app: { name: string };
};

const TYPES = ["bug", "feedback", "feature"] as const;

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [newAppName, setNewAppName] = useState("");
  const [newKeyReveal, setNewKeyReveal] = useState<{ name: string; apiKey: string } | null>(null);
  const [webhookDraft, setWebhookDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const authFetch = useCallback(
    (url: string, init: RequestInit = {}) =>
      fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } }),
    [token]
  );

  useEffect(() => {
    const t = sessionStorage.getItem("admin_token");
    if (!t) {
      router.push("/admin/login");
      return;
    }
    setToken(t);
  }, [router]);

  const loadApps = useCallback(async () => {
    const res = await authFetch("/api/admin/apps");
    if (res.status === 401) {
      sessionStorage.removeItem("admin_token");
      router.push("/admin/login");
      return;
    }
    const data = await res.json();
    setApps(data.apps ?? []);
  }, [authFetch, router]);

  const loadFeedback = useCallback(async () => {
    const res = await authFetch("/api/admin/feedback?limit=25");
    const data = await res.json();
    setFeedback(data.feedback ?? []);
  }, [authFetch]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([loadApps(), loadFeedback()]).finally(() => setLoading(false));
  }, [token, loadApps, loadFeedback]);

  async function createApp(e: React.FormEvent) {
    e.preventDefault();
    if (!newAppName.trim()) return;
    const res = await authFetch("/api/admin/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newAppName.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      setNewKeyReveal({ name: data.app.name, apiKey: data.app.apiKey });
      setNewAppName("");
      loadApps();
    }
  }

  async function toggleRevoke(app: AppRow) {
    await authFetch(`/api/admin/apps/${app.id}/revoke`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disabled: !app.disabled }),
    });
    loadApps();
  }

  async function saveWebhook(appId: string, type: string) {
    const key = `${appId}:${type}`;
    const url = webhookDraft[key];
    if (!url) return;
    await authFetch("/api/admin/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, type, url }),
    });
    loadApps();
  }

  if (!token) return null;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <h1>Feedback Bot Admin</h1>

      <section style={{ background: "#1a1d27", padding: 20, borderRadius: 12, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Create App</h2>
        <form onSubmit={createApp} style={{ display: "flex", gap: 8 }}>
          <input
            value={newAppName}
            onChange={(e) => setNewAppName(e.target.value)}
            placeholder="App name (e.g. MyApp iOS)"
            style={{ flex: 1, padding: 10, borderRadius: 6, border: "1px solid #333", background: "#0f1117", color: "#e6e6e6" }}
          />
          <button type="submit" style={{ padding: "10px 16px", borderRadius: 6, border: "none", background: "#7aa2f7", fontWeight: 600, cursor: "pointer" }}>
            Create
          </button>
        </form>
        {newKeyReveal && (
          <div style={{ marginTop: 12, background: "#0f1117", padding: 12, borderRadius: 8, border: "1px solid #2ecc71" }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              API key for <strong>{newKeyReveal.name}</strong> (copy now — shown only once):
            </p>
            <code style={{ display: "block", marginTop: 6, wordBreak: "break-all" }}>{newKeyReveal.apiKey}</code>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Apps {loading && <span style={{ fontSize: 13, opacity: 0.6 }}>(loading...)</span>}</h2>
        {apps.map((app) => (
          <div key={app.id} style={{ background: "#1a1d27", padding: 16, borderRadius: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{app.name}</strong>{" "}
                <span style={{ opacity: 0.6, fontSize: 13 }}>({app.apiKeyMasked})</span>{" "}
                {app.disabled && <span style={{ color: "#e74c3c", fontSize: 12 }}>REVOKED</span>}
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 13, opacity: 0.7 }}>{app.feedbackCount} feedback</span>
                <button
                  onClick={() => toggleRevoke(app)}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", background: app.disabled ? "#2ecc71" : "#e74c3c", color: "#fff" }}
                >
                  {app.disabled ? "Re-enable" : "Revoke"}
                </button>
              </div>
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {TYPES.map((type) => {
                const existing = app.webhooks.find((w) => w.type === type)?.url ?? "";
                const key = `${app.id}:${type}`;
                return (
                  <div key={type} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ width: 70, fontSize: 12, opacity: 0.7, textTransform: "capitalize" }}>{type}</span>
                    <input
                      defaultValue={existing}
                      placeholder="Discord webhook URL"
                      onChange={(e) => setWebhookDraft((d) => ({ ...d, [key]: e.target.value }))}
                      style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid #333", background: "#0f1117", color: "#e6e6e6", fontSize: 12 }}
                    />
                    <button
                      onClick={() => saveWebhook(app.id, type)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #7aa2f7", background: "transparent", color: "#7aa2f7", cursor: "pointer", fontSize: 12 }}
                    >
                      Save
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {apps.length === 0 && !loading && <p style={{ opacity: 0.6 }}>No apps yet — create one above.</p>}
      </section>

      <section>
        <h2>Recent Feedback</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {feedback.map((f) => (
            <div key={f.id} style={{ background: "#1a1d27", padding: 12, borderRadius: 8, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.7, marginBottom: 4 }}>
                <span>
                  <strong>{f.app.name}</strong> · {f.type}
                </span>
                <span>{f.discordDelivered ? "✅ sent" : "⚠️ not sent"}</span>
              </div>
              <div>{f.message}</div>
              <div style={{ opacity: 0.5, fontSize: 11, marginTop: 4 }}>{new Date(f.createdAt).toLocaleString()}</div>
            </div>
          ))}
          {feedback.length === 0 && !loading && <p style={{ opacity: 0.6 }}>No feedback yet.</p>}
        </div>
      </section>
    </main>
  );
}
