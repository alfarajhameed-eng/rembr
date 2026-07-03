"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Cadence, ReminderType } from "@/lib/types";

export default function NewReminder() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [cadence, setCadence] = useState<Cadence>("daily");
  const [type, setType] = useState<ReminderType>("simple");
  const [targetValue, setTargetValue] = useState("");
  const [targetUnit, setTargetUnit] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    await supabase.from("reminders").insert({
      title: title.trim(),
      cadence,
      type,
      target_value: type === "target" ? parseFloat(targetValue) || null : null,
      target_unit: type === "target" ? targetUnit.trim() || null : null
    });
    setSaving(false);
    router.push("/");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.65rem 0.8rem",
    borderRadius: "10px",
    border: "1px solid var(--paper-line)",
    background: "white",
    fontSize: "0.95rem",
    marginTop: "0.3rem"
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.85rem",
    color: "var(--ink-soft)",
    marginTop: "1.1rem"
  };

  return (
    <main style={{ maxWidth: "480px", margin: "0 auto", padding: "1.5rem 1.2rem 3rem" }}>
      <h1 className="display" style={{ fontSize: "1.5rem", marginBottom: "0.2rem" }}>
        New reminder
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginTop: 0 }}>
        What do you want Rembr to help you stay on top of?
      </p>

      <label style={labelStyle}>
        What's the reminder?
        <input
          style={inputStyle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Drink water, Laundry, Football"
        />
      </label>

      <label style={labelStyle}>
        How often?
        <select style={inputStyle} value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)}>
          <option value="daily">Every day</option>
          <option value="weekly">Every week</option>
          <option value="monthly">Every month</option>
          <option value="every_monday">Every Monday</option>
          <option value="every_other_day">Every other day</option>
        </select>
      </label>

      <label style={labelStyle}>
        What kind of reminder is this?
        <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value as ReminderType)}>
          <option value="simple">A simple nudge (e.g. do laundry)</option>
          <option value="target">Track toward a daily amount (e.g. drink 3L of water)</option>
        </select>
      </label>

      {type === "target" && (
        <div style={{ display: "flex", gap: "0.7rem" }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Daily goal
            <input
              style={inputStyle}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="3000"
              inputMode="decimal"
            />
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            Unit
            <input
              style={inputStyle}
              value={targetUnit}
              onChange={(e) => setTargetUnit(e.target.value)}
              placeholder="ml"
            />
          </label>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving || !title.trim()}
        style={{
          marginTop: "1.8rem",
          width: "100%",
          background: "var(--ink)",
          color: "var(--paper)",
          border: "none",
          borderRadius: "999px",
          padding: "0.8rem",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        {saving ? "Saving…" : "Create reminder"}
      </button>
    </main>
  );
}
