"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Reminder, Checkin } from "@/lib/types";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function cadenceLabel(reminder: Reminder) {
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

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function ReminderCard({
  reminder,
  todaysCheckins,
  onLogged
}: {
  reminder: Reminder;
  todaysCheckins: Checkin[];
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

  async function markSimpleDone() {
    setSaving(true);
    await supabase.from("checkins").insert({
      reminder_id: reminder.id,
      raw_response: "done",
      completed: true
    });
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
    setValue("");
    setSaving(false);
    onLogged();
  }

  return (
    <div
      style={{
        background: "var(--paper)",
        border: "1px solid var(--paper-line)",
        borderRadius: "var(--radius)",
        padding: "1.1rem 1.2rem",
        marginBottom: "0.9rem"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{reminder.title}</h3>
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

      {reminder.type === "simple" && (
        <div style={{ marginTop: "0.7rem" }}>
          {isDoneSimple ? (
            <span style={{ color: "var(--ochre)", fontWeight: 600, fontSize: "0.9rem" }}>
              ✓ Done for today
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
    </div>
  );
}

export default function Home() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
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
      .gte("responded_at", startOfToday());

    setReminders(reminderData || []);
    setCheckins(checkinData || []);
    setLoading(false);
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
          <strong>Turn on notifications:</strong> tap Share in Safari → Add to Home Screen,
          then open Rembr from your home screen.
        </div>
      )}

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

      {reminders.map((r) => (
        <ReminderCard key={r.id} reminder={r} todaysCheckins={checkins} onLogged={load} />
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
