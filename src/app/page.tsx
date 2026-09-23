export default function Home() {
  return (
    <main style={{ padding: 40, maxWidth: 640, margin: "0 auto" }}>
      <h1>Feedback Bot</h1>
      <p>API is running. Go to <a href="/admin" style={{ color: "#7aa2f7" }}>/admin</a> to manage apps and webhooks.</p>
      <p style={{ opacity: 0.7, fontSize: 14 }}>
        Feedback ingestion endpoint: <code>POST /api/v1/feedback</code>
      </p>
    </main>
  );
}
