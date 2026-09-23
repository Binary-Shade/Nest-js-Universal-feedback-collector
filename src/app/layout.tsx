import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feedback Bot Admin",
  description: "Universal Product Feedback Discord Bot — Admin Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#0f1117", color: "#e6e6e6" }}>
        {children}
      </body>
    </html>
  );
}
