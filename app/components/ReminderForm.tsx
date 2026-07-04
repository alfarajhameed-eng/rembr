"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Cadence, Reminder, ReminderType } from "@/lib/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ReminderForm({ existing }: { existing?: Reminder }) {
  const router = useRouter();
  const isEditing = !!existing;

  const [title, setTitle] = useState(existing?.title || "");
  const [cadence, setCadence] = useState<Cadence>(existing?.cadence || "daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(existing?.days_of_week || []);
  const [intervalDays, setIntervalDays] = useState(
    existing?.interval_days ? String(existing.interval_days) : "3"
  );
  const [type, setType] = useState<ReminderType>(existing?.type || "simple");
  const [targetValue, setTargetValue] = useState(
    existing?.target_value ? String(existing.target_value) : ""
  );
  const [targetUnit, setTargetUnit] = useState(existing?.target_unit || "");
  const [assignedLabel, setAssignedLabel] = useState(existing?.assigned_label || "");
  const [saving, setSaving] = useState(false);

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function save() {
    if (!title.trim()) return;
    setSaving(true);

    const payload = {
      title: title.trim(),
      cadence,
      days_of_week: cadence === "days_of_week" ? daysOfWeek : null,
      interval_days: cadence === "interval" ? parseInt(intervalDays) || null : null,
      type,
      target_value: type === "target" ? parseFloat(targetValue) || null : null,
      target_unit: type === "target" ? targetUnit.trim() || null : null,
      assigned_label: assignedLabel.trim() || null
    };

    if (isEditing) {
      await supabase.from("reminders").update(payload).eq("id", existing!.id);
    } else {
      await supabase.from("reminders").insert(payload);
    }

    setSaving(false);
    router.push("/");
  }

  async function remove() {
    if (!existing) return;
    const confirmed = window.confirm(`Delete "${existing.title}"? This can't be undone.`);
    if (!confirmed) return;
    setSaving(true);
    await supabase.from("reminders").delete().eq("id", existing.id);
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

  const dayButtonStyle = (active: boolean): React.CSSProperties => ({
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: active ? "none" : "1px solid var(--paper-line)",
    background: active ? "var(--salmon)" : "white",
    color: active ? "white" : "var(--ink)",
    fontSize: "0.8rem",
    cursor: "pointer"
  });

  return (
    <main style={{ maxWidth: "480px", margin: "0 auto", padding: "1.5rem 1.2rem 3rem" }}>
      <h1 className="display" style={{ fontSize: "1.5rem", marginBottom: "0.2rem" }}>
        {isEditing ? "Edit reminder" : "New reminder"}
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginTop: 0 }}>
        {isEditing
          ? "Change how or when this shows up."
          : "What do you want Rembr to help you stay on top of?"}
      </p>

      <label style={labelStyle}>
        What's the reminder?
        <input
          style={inputStyle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Drink water, Laundry, Football, Call mom"
        />
      </label>

      <label style={labelStyle}>
        Label (optional — whose is this?)
        <input
          style={inputStyle}
          value={assignedLabel}
          onChange={(e) => setAssignedLabel(e.target.value)}
          placeholder="e.g. Hameed, Wejdan, Family"
        />
      </label>

      <label style={labelStyle}>How often?</label>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
        {(
          [
            { key: "daily", label: "Every day" },
            { key: "days_of_week", label: "Specific days" },
            { key: "interval", label: "Every X days" }
          ] as { key: Cadence; label: string }[]
        ).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setCadence(opt.key)}
            style={{
              flex: 1,
              padding: "0.5rem 0.4rem",
              borderRadius: "10px",
              border: cadence === opt.key ? "none" : "1px solid var(--paper-line)",
              background: cadence === opt.key ? "var(--ink)" : "white",
              color: cadence === opt.key ? "var(--paper)" : "var(--ink)",
              fontSize: "0.8rem",
              cursor: "pointer"
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {cadence === "days_of_week" && (
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.8rem", flexWrap: "wrap" }}>
          {DAY_LABELS.map((label, i) => (
            <button key={i} onClick={() => toggleDay(i)} style={dayButtonStyle(daysOfWeek.includes(i))}>
              {label[0]}
            </button>
          ))}
        </div>
      )}

      {cadence === "interval" && (
        <div style={{ marginTop: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.9rem" }}>Every</span>
          <input
            style={{ ...inputStyle, width: "70px", marginTop: 0 }}
            value={intervalDays}
            onChange={(e) => setIntervalDays(e.target.value)}
            inputMode="numeric"
          />
          <span style={{ fontSize: "0.9rem" }}>days</span>
        </div>
      )}

      <label style={labelStyle}>
        What kind of reminder is this?
        <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value as ReminderType)}>
          <option value="simple">A simple nudge (e.g. do laundry, call mom)</option>
          <option value="target">Track toward an amount (e.g. water, pages read, pushups)</option>
        </select>
      </label>

      {type === "target" && (
        <div style={{ display: "flex", gap: "0.7rem" }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Goal amount
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
              placeholder="ml, pages, reps…"
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
        {saving ? "Saving…" : isEditing ? "Save changes" : "Create reminder"}
      </button>

      {isEditing && (
        <button
          onClick={remove}
          disabled={saving}
          style={{
            marginTop: "0.8rem",
            width: "100%",
            background: "var(--danger-soft)",
            color: "var(--danger)",
            border: "none",
            borderRadius: "999px",
            padding: "0.75rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Delete this reminder
        </button>
      )}
    </main>
  );
}
