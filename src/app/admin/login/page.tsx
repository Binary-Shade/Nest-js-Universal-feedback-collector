"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/apps", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError("Invalid admin token");
        setLoading(false);
        return;
      }
      sessionStorage.setItem("admin_token", token);
      router.push("/admin");
    } catch {
      setError("Could not reach the server");
      setLoading(false);
    }
  }

  return (
    <main style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <form
        onSubmit={handleSubmit}
        style={{ background: "#1a1d27", padding: 32, borderRadius: 12, width: 340, display: "flex", flexDirection: "column", gap: 12 }}
      >
        <h2 style={{ margin: 0 }}>Admin Login</h2>
        <input
          type="password"
          placeholder="Admin token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{ padding: 10, borderRadius: 6, border: "1px solid #333", background: "#0f1117", color: "#e6e6e6" }}
          required
        />
        {error && <p style={{ color: "#e74c3c", margin: 0, fontSize: 13 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, borderRadius: 6, border: "none", background: "#7aa2f7", color: "#0f1117", fontWeight: 600, cursor: "pointer" }}
        >
          {loading ? "Checking..." : "Log in"}
        </button>
      </form>
    </main>
  );
}
