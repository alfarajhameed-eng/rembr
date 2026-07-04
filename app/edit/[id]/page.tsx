"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";
import type { Reminder } from "@/lib/types";
import ReminderForm from "@/app/components/ReminderForm";

export default function EditReminderPage() {
  const { loading: authLoading } = useAuth();
  const params = useParams();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("reminders")
        .select("*")
        .eq("id", params.id)
        .single();
      setReminder(data);
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (authLoading || loading) {
    return (
      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "2rem 1.2rem" }}>
        <p style={{ color: "var(--ink-soft)" }}>Loading…</p>
      </main>
    );
  }

  if (!reminder) {
    return (
      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "2rem 1.2rem" }}>
        <p>Reminder not found.</p>
      </main>
    );
  }

  return <ReminderForm existing={reminder} />;
}
