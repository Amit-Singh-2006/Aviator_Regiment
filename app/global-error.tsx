"use client";

// Last-resort error page, used only when the root layout itself fails.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en">
    <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a1b3d", color: "white", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 24 }}>
      <div>
        <p style={{ color: "#d6a84f", letterSpacing: ".12em", textTransform: "uppercase", fontSize: 12 }}>Aviator&apos;s Regiment</p>
        <h1 style={{ fontSize: 32, margin: "12px 0" }}>Something went wrong.</h1>
        <p style={{ color: "#c8d0e0" }}>Please try again in a moment.</p>
        <button type="button" onClick={reset} style={{ marginTop: 16, padding: "12px 20px", border: 0, borderRadius: 999, background: "#b9852d", color: "#0a1b3d", fontWeight: 800, cursor: "pointer" }}>Try again</button>
      </div>
    </body>
  </html>;
}
