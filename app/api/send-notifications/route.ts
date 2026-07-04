import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import type { Reminder, Checkin } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

webpush.setVapidDetails(
  "mailto:alfarajhameed@gmail.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isDueToday(reminder: Reminder): boolean {
  const today = startOfToday();
  const todayDay = today.getDay();

  if (reminder.cadence === "daily") return true;

  if (reminder.cadence === "days_of_week") {
    return (reminder.days_of_week || []).includes(todayDay);
  }

  if (reminder.cadence === "interval") {
    if (!reminder.last_notified_at) return true;
    const last = new Date(reminder.last_notified_at);
    const daysSince = Math.floor((today.getTime() - last.getTime()) / 86400000);
    return daysSince >= (reminder.interval_days || 1);
  }

  return false;
}

function alreadyNotifiedToday(reminder: Reminder): boolean {
  if (!reminder.last_notified_at) return false;
  const last = new Date(reminder.last_notified_at);
  const today = startOfToday();
  return last >= today;
}

function isDoneToday(reminder: Reminder, checkins: Checkin[]): boolean {
  const mine = checkins.filter((c) => c.reminder_id === reminder.id);
  if (reminder.type === "simple") return mine.some((c) => c.completed);
  if (reminder.type === "target" && reminder.target_value) {
    const total = mine.reduce((sum, c) => sum + (c.parsed_value || 0), 0);
    return total >= reminder.target_value;
  }
  return false;
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: reminders } = await supabase
    .from("reminders")
    .select("*")
    .eq("active", true);

  const { data: checkins } = await supabase
    .from("checkins")
    .select("*")
    .gte("responded_at", startOfToday().toISOString());

  const { data: subscriptions } = await supabase.from("push_subscriptions").select("*");

  if (!reminders || !subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, note: "no reminders or no subscriptions" });
  }

  let sent = 0;

  for (const reminder of reminders as Reminder[]) {
    if (!isDueToday(reminder)) continue;
    if (alreadyNotifiedToday(reminder)) continue;
    if (isDoneToday(reminder, (checkins as Checkin[]) || [])) continue;

    const payload = JSON.stringify({
      title: "Rembr",
      body: reminder.title,
      url: "/"
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          },
          payload
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    await supabase
      .from("reminders")
      .update({ last_notified_at: new Date().toISOString() })
      .eq("id", reminder.id);
  }

  return NextResponse.json({ sent });
}
