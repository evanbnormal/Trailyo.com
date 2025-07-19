"use client";
export default function Error({ error }: { error: Error }) {
  return (
    <div style={{ padding: 32 }}>
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
    </div>
  );
} 