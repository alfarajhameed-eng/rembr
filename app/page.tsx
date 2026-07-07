"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NotificationSetup from "@/app/components/NotificationSetup";
import { supabase } from "@/lib/supabaseClient";
import type { Reminder, Checkin, Subtask, SubtaskCheckin } from "@/lib/types";
import { isDoneToday, isDueToday, daysOverdue, startOfToday } from "@/lib/reminderLogic";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function cadenceLabel(reminder: Reminder) {
  if (reminder.cadence === "once" && reminder.due_at) {
    const d = new Date(reminder.due_at);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
      " · " +
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  if (reminder.cadence === "daily") return "Every day";
  if (reminder.cadence === "days_of_week") {
    const days = reminder.days_of_week || [];
    if (days.length === 0) return "Specific days";
    return days.map((d) => DAY_SHORT[d]).join(", ");
  }
  if (reminder.cadence === "interval") {
    return `Every ${reminder.interval_days || "?"} days`;
  }
  return reminder.cadence;
}

function ReminderCard({
  reminder,
  todaysCheckins,
  subtasks,
  subtaskCheckins,
  done,
  overdueDays,
  onLogged
}: {
  reminder: Reminder;
  todaysCheckins: Checkin[];
  subtasks: Subtask[];
  subtaskCheckins: SubtaskCheckin[];
  done: boolean;
  overdueDays: number;
  onLogged: () => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const totalToday = todaysCheckins
    .filter((c) => c.reminder_id === reminder.id)
    .reduce((sum, c) => sum + (c.parsed_value || 0), 0);

  const isDoneSimple =
    reminder.type === "simple" &&
    todaysCheckins.some((c) => c.reminder_id === reminder.id && c.completed);

  const progressPct =
    reminder.type === "target" && reminder.target_value
      ? Math.min(100, Math.round((totalToday / reminder.target_value) * 100))
      : 0;

  const mySubtasks = subtasks
    .filter((s) => s.reminder_id === reminder.id && s.active)
    .sort((a, b) => a.sort_order - b.sort_order);

  async function markCompletedNow() {
    await supabase
      .from("reminders")
      .update({ last_completed_at: new Date().toISOString() })
      .eq("id", reminder.id);
  }

  async function markSimpleDone() {
    setSaving(true);
    await supabase.from("checkins").insert({
      reminder_id: reminder.id,
      raw_response: "done",
      completed: true
    });
    await markCompletedNow();
    setSaving(false);
    onLogged();
  }

  async function logAmount() {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setSaving(true);
    const newTotal = totalToday + num;
    const completed = reminder.target_value ? newTotal >= reminder.target_value : false;
    await supabase.from("checkins").insert({
      reminder_id: reminder.id,
      raw_response: value,
      parsed_value: num,
      completed
    });
    if (completed) await markCompletedNow();
    setValue("");
    setSaving(false);
    onLogged();
  }

  async function toggleSubtask(subtaskId: string, currentlyDone: boolean) {
    setSaving(true);
    if (currentlyDone) {
      const today = startOfToday();
      await supabase
        .from("subtask_checkins")
        .delete()
        .eq("subtask_id", subtaskId)
        .gte("responded_at", today.toISOString());
    } else {
      await supabase.from("subtask_checkins").insert({ subtask_id: subtaskId });
    }

    const allDone = mySubtasks.every((s) => {
      if (s.id === subtaskId) return !currentlyDone;
      const today = startOfToday();
      return subtaskCheckins.some(
        (c) => c.subtask_id === s.id && new Date(c.responded_at) >= today
      );
    });
    if (allDone) await markCompletedNow();

    setSaving(false);
    onLogged();
  }

  return (
    <div
      style={{
        background: done ? "var(--ochre-soft)" : overdueDays > 0 ? "var(--danger-soft)" : "var(--paper)",
        border: done
          ? "1px solid transparent"
          : overdueDays > 0
          ? "1.5px solid var(--danger)"
          : "1.5px solid var(--salmon)",
        borderRadius: "var(--radius)",
        padding: "1.1rem 1.2rem",
        marginBottom: "0.9rem",
        opacity: done ? 0.7 : 1,
        transition: "all 0.3s ease"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {done && "✓ "}
          {reminder.title}
          {reminder.assigned_label && (
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                background: "var(--salmon-soft)",
                color: "var(--salmon-dark)",
                borderRadius: "999px",
                padding: "0.15rem 0.5rem"
              }}
            >
              {reminder.assigned_label}
            </span>
          )}
          {overdueDays > 0 && (
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                background: "var(--danger)",
                color: "white",
                borderRadius: "999px",
                padding: "0.15rem 0.5rem"
              }}
            >
              {overdueDays} {overdueDays === 1 ? "day" : "days"} overdue
            </span>
          )}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
            {cadenceLabel(reminder)}
          </span>
          <Link
            href={`/edit/${reminder.id}`}
            style={{ fontSize: "0.75rem", color: "var(--salmon-dark)", textDecoration: "none" }}
          >
            Edit
          </Link>
        </div>
      </div>

      {reminder.ai_message && (
        <p
          style={{
            fontSize: "0.82rem",
            fontStyle: "italic",
            color: "var(--ink-soft)",
            margin: "0.5rem 0 0"
          }}
        >
          {reminder.ai_message}
        </p>
      )}

      {reminder.type === "simple" && (
        <div style={{ marginTop: "0.7rem" }}>
          {isDoneSimple ? (
            <span style={{ color: "var(--ochre)", fontWeight: 600, fontSize: "0.9rem" }}>
              ✓ Done
            </span>
          ) : (
            <button
              onClick={markSimpleDone}
              disabled={saving}
              style={{
                background: "var(--ochre)",
                color: "white",
                border: "none",
                borderRadius: "999px",
                padding: "0.4rem 1rem",
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              Mark done
            </button>
          )}
        </div>
      )}

      {reminder.type === "target" && (
        <div style={{ marginTop: "0.7rem" }}>
          <div
            style={{
              height: "8px",
              borderRadius: "999px",
              background: "var(--ochre-soft)",
              overflow: "hidden",
              marginBottom: "0.5rem"
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: "var(--ochre)",
                transition: "width 0.3s ease"
              }}
            />
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginBottom: "0.5rem" }}>
            {totalToday} / {reminder.target_value} {reminder.target_unit} today
            {progressPct >= 100 && " — goal reached 🎉"}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Log ${reminder.target_unit || "amount"}`}
              inputMode="decimal"
              style={{
                flex: 1,
                padding: "0.5rem 0.7rem",
                borderRadius: "10px",
                border: "1px solid var(--paper-line)",
                background: "white",
                fontSize: "0.9rem"
              }}
            />
            <button
              onClick={logAmount}
              disabled={saving || !value}
              style={{
                background: "var(--salmon)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "0.5rem 1rem",
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              Log
            </button>
          </div>
        </div>
      )}

      {reminder.type === "checklist" && (
        <div style={{ marginTop: "0.7rem" }}>
          {mySubtasks.length === 0 && (
            <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>No items yet — edit to add some.</p>
          )}
          {mySubtasks.map((s) => {
            const today = startOfToday();
            const subDone = subtaskCheckins.some(
              (c) => c.subtask_id === s.id && new Date(c.responded_at) >= today
            );
            return (
              <label
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.9rem",
                  marginBottom: "0.4rem",
                  cursor: "pointer",
                  textDecoration: subDone ? "line-through" : "none",
                  color: subDone ? "var(--ink-soft)" : "var(--ink)"
                }}
              >
                <input
                  type="checkbox"
                  checked={subDone}
                  onChange={() => toggleSubtask(s.id, subDone)}
                  disabled={saving}
                />
                {s.title}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskCheckins, setSubtaskCheckins] = useState<SubtaskCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  async function load() {
    const { data: reminderData } = await supabase
      .from("reminders")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: true });

    const { data: checkinData } = await supabase
      .from("checkins")
      .select("*")
      .gte("responded_at", startOfToday().toISOString());

    const { data: subtaskData } = await supabase.from("subtasks").select("*").eq("active", true);

    const { data: subtaskCheckinData } = await supabase
      .from("subtask_checkins")
      .select("*")
      .gte("responded_at", startOfToday().toISOString());

    setReminders(reminderData || []);
    setCheckins(checkinData || []);
    setSubtasks(subtaskData || []);
    setSubtaskCheckins(subtaskCheckinData || []);
    setLoading(false);

    // Generate a fresh AI nudge for pending reminders that don't have one from today yet.
    const today = startOfToday();
    const staleReminders = (reminderData || []).filter((r: Reminder) => {
      return !r.ai_message_at || new Date(r.ai_message_at) < today;
    });

    if (staleReminders.length > 0) {
      Promise.all(
        staleReminders.map((r: Reminder) =>
          fetch("/api/nudge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reminder_id: r.id })
          }).catch(() => {})
        )
      ).then(() => {
        // Quietly refresh reminder data so new nudge messages show up
        supabase
          .from("reminders")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: true })
          .then(({ data }) => {
            if (data) setReminders(data);
          });
      });
    }
  }

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    setIsIOS(/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()));

    load();
  }, []);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  const visibleReminders = reminders.filter((r) => isDueToday(r) || daysOverdue(r, checkins, subtasks, subtaskCheckins) > 0 || isDoneToday(r, checkins, subtasks, subtaskCheckins));

  return (
    <main style={{ maxWidth: "480px", margin: "0 auto", padding: "1.5rem 1.2rem 5rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 className="display" style={{ fontSize: "1.8rem", margin: 0 }}>
          Rembr
        </h1>
        <p style={{ margin: "0.2rem 0 0", color: "var(--ink-soft)", fontSize: "0.9rem" }}>
          {today}
        </p>
      </header>

      {isIOS && !isStandalone && (
        <div
          style={{
            background: "var(--amber-soft)",
            border: "1px solid var(--amber)",
            borderRadius: "var(--radius)",
            padding: "0.9rem 1rem",
            marginBottom: "1.2rem",
            fontSize: "0.85rem"
          }}
        >
          <strong>One more step:</strong> tap Share in Safari → Add to Home Screen,
          then open Rembr from your home screen to turn on notifications.
        </div>
      )}

      {(!isIOS || isStandalone) && <NotificationSetup />}

      {loading && <p style={{ color: "var(--ink-soft)" }}>Loading…</p>}

      {!loading && reminders.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
            color: "var(--ink-soft)"
          }}
        >
          <p>No reminders yet.</p>
          <p>Add the first thing you want Rembr to help you stay on top of.</p>
        </div>
      )}

      {[...visibleReminders]
        .sort((a, b) => {
          const aOverdue = daysOverdue(a, checkins, subtasks, subtaskCheckins);
          const bOverdue = daysOverdue(b, checkins, subtasks, subtaskCheckins);
          const aDone = isDoneToday(a, checkins, subtasks, subtaskCheckins);
          const bDone = isDoneToday(b, checkins, subtasks, subtaskCheckins);
          if (aDone !== bDone) return aDone ? 1 : -1;
          if (aOverdue !== bOverdue) return bOverdue - aOverdue;
          return 0;
        })
        .map((r) => (
          <ReminderCard
            key={r.id}
            reminder={r}
            todaysCheckins={checkins}
            subtasks={subtasks}
            subtaskCheckins={subtaskCheckins}
            done={isDoneToday(r, checkins, subtasks, subtaskCheckins)}
            overdueDays={daysOverdue(r, checkins, subtasks, subtaskCheckins)}
            onLogged={load}
          />
        ))}

      <Link
        href="/new"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--ink)",
          color: "var(--paper)",
          borderRadius: "999px",
          padding: "0.8rem 1.6rem",
          fontSize: "0.95rem",
          textDecoration: "none",
          fontWeight: 600,
          boxShadow: "0 4px 14px rgba(0,0,0,0.15)"
        }}
      >
        + New reminder
      </Link>
    </main>
  );
}
