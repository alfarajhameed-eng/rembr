"use client";

import { useState } from "react";
import ReminderForm from "@/app/components/ReminderForm";

export default function NewReminderPage() {
  const [mode, setMode] = useState<"describe" | "manual">("describe");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prefill, setPrefill] = useState<any>(undefined);

  async function parse() {
    if (!description.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/parse-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Couldn't understand that — try rephrasing, or fill it in manually.");
        setLoading(false);
        return;
      }

      setPrefill(data.parsed);
      setMode("manual");
    } catch {
      setError("Something went wrong. Try again, or fill it in manually.");
    }
    setLoading(false);
  }

  if (mode === "manual") {
    return (
      <>
        {prefill && (
          <div
            style={{
              maxWidth: "480px",
              margin: "1.5rem auto 0",
              padding: "0 1.2rem"
            }}
          >
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--ink-soft)",
                background: "var(--salmon-soft)",
                padding: "0.6rem 0.9rem",
                borderRadius: "10px"
              }}
            >
              Here's what I understood — review and adjust before saving.
            </p>
          </div>
        )}
        <ReminderForm prefill={prefill} />
      </>
    );
  }

  return (
    <main style={{ maxWidth: "480px", margin: "0 auto", padding: "1.5rem 1.2rem 3rem" }}>
      <h1 className="display" style={{ fontSize: "1.5rem", marginBottom: "0.2rem" }}>
        New reminder
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginTop: 0 }}>
        Describe it however you'd say it out loud.
      </p>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={`e.g. "remind me to walk the dog every day at 6pm" or "laundry checklist with whites, mix, and baby clothes"`}
        rows={4}
        style={{
          width: "100%",
          padding: "0.8rem",
          borderRadius: "12px",
          border: "1px solid var(--paper-line)",
          background: "white",
          fontSize: "0.95rem",
          marginTop: "1rem",
          fontFamily: "inherit",
          resize: "vertical"
        }}
      />

      {error && (
        <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "0.6rem" }}>{error}</p>
      )}

      <button
        onClick={parse}
        disabled={loading || !description.trim()}
        style={{
          marginTop: "1rem",
          width: "100%",
          background: "var(--salmon)",
          color: "white",
          border: "none",
          borderRadius: "999px",
          padding: "0.8rem",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        {loading ? "Thinking…" : "Create with AI"}
      </button>

      <button
        onClick={() => setMode("manual")}
        style={{
          marginTop: "0.8rem",
          width: "100%",
          background: "none",
          border: "none",
          color: "var(--ink-soft)",
          fontSize: "0.85rem",
          textDecoration: "underline",
          cursor: "pointer"
        }}
      >
        Or fill it in manually
      </button>
    </main>
  );
}
