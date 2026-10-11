"use client";

export default function BladGlobalny({ error }: { error: Error }) {
  return (
    <html lang="pl">
      <body style={{ fontFamily: "sans-serif", padding: "2rem" }}>
        <h1>Coś nie wstało</h1>
        <p>{error.message}</p>
      </body>
    </html>
  );
}
