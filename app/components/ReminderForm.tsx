"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Cadence, Reminder, ReminderType, Subtask } from "@/lib/types";

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
  const [dueDate, setDueDate] = useState(
    existing?.due_at ? existing.due_at.slice(0, 10) : ""
  );
  const [dueTime, setDueTime] = useState(
    existing?.due_at ? existing.due_at.slice(11, 16) : "09:00"
  );
  const [type, setType] = useState<ReminderType>(existing?.type || "simple");
  const [targetValue, setTargetValue] = useState(
    existing?.target_value ? String(existing.target_value) : ""
  );
  const [targetUnit, setTargetUnit] = useState(existing?.target_unit || "");
  const [assignedLabel, setAssignedLabel] = useState(existing?.assigned_label || "");
  const [subtaskTitles, setSubtaskTitles] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) return;
    async function loadSubtasks() {
      const { data } = await supabase
        .from("subtasks")
        .select("*")
        .eq("reminder_id", existing!.id)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (data && data.length > 0) {
        setSubtaskTitles((data as Subtask[]).map((s) => s.title));
      }
    }
    loadSubtasks();
  }, [existing]);

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function updateSubtask(index: number, value: string) {
    setSubtaskTitles((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function addSubtaskField() {
    setSubtaskTitles((prev) => [...prev, ""]);
  }

  function removeSubtaskField(index: number) {
    setSubtaskTitles((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    if (!title.trim()) return;
    if (cadence === "once" && !dueDate) return;
    setSaving(true);

    const due_at =
      cadence === "once" && dueDate ? new Date(`${dueDate}T${dueTime}`).toISOString() : null;

    const payload = {
      title: title.trim(),
      cadence,
      days_of_week: cadence === "days_of_week" ? daysOfWeek : null,
      interval_days: cadence === "interval" ? parseInt(intervalDays) || null : null,
      due_at,
      type,
      target_value: type === "target" ? parseFloat(targetValue) || null : null,
      target_unit: type === "target" ? targetUnit.trim() || null : null,
      assigned_label: assignedLabel.trim() || null
    };

    let reminderId = existing?.id;

    if (isEditing) {
      await supabase.from("reminders").update(payload).eq("id", existing!.id);
    } else {
      const { data } = await supabase.from("reminders").insert(payload).select().single();
      reminderId = data?.id;
    }

    if (type === "checklist" && reminderId) {
      await supabase.from("subtasks").delete().eq("reminder_id", reminderId);
      const cleanTitles = subtaskTitles.map((t) => t.trim()).filter(Boolean);
      if (cleanTitles.length > 0) {
        await supabase.from("subtasks").insert(
          cleanTitles.map((t, i) => ({
            reminder_id: reminderId,
            title: t,
            sort_order: i
          }))
        );
      }
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
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
        {(
          [
            { key: "daily", label: "Every day" },
            { key: "days_of_week", label: "Specific days" },
            { key: "interval", label: "Every X days" },
            { key: "once", label: "One time" }
          ] as { key: Cadence; label: string }[]
        ).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setCadence(opt.key)}
            style={{
              flex: "1 1 45%",
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

      {cadence === "once" && (
        <div style={{ display: "flex", gap: "0.7rem" }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Date
            <input
              type="date"
              style={inputStyle}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            Time
            <input
              type="time"
              style={inputStyle}
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </label>
        </div>
      )}

      <label style={labelStyle}>
        What kind of reminder is this?
        <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value as ReminderType)}>
          <option value="simple">A simple nudge (e.g. do laundry, call mom)</option>
          <option value="target">Track toward an amount (e.g. water, pages read, pushups)</option>
          <option value="checklist">A checklist (e.g. Laundry: whites, mix, baby clothes)</option>
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

      {type === "checklist" && (
        <div>
          <label style={labelStyle}>Items that must all be done</label>
          {subtaskTitles.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
              <input
                style={{ ...inputStyle, marginTop: 0 }}
                value={t}
                onChange={(e) => updateSubtask(i, e.target.value)}
                placeholder={`Item ${i + 1}, e.g. Whites`}
              />
              {subtaskTitles.length > 1 && (
                <button
                  onClick={() => removeSubtaskField(i)}
                  style={{
                    border: "none",
                    background: "var(--danger-soft)",
                    color: "var(--danger)",
                    borderRadius: "10px",
                    padding: "0 0.8rem",
                    cursor: "pointer"
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addSubtaskField}
            style={{
              marginTop: "0.6rem",
              border: "1px dashed var(--paper-line)",
              background: "none",
              color: "var(--ink-soft)",
              borderRadius: "10px",
              padding: "0.4rem 0.8rem",
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            + Add item
          </button>
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
