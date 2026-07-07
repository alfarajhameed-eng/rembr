import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import type { Reminder, Checkin, Subtask, SubtaskCheckin } from "@/lib/types";
import { isDueToday, isDoneToday, daysOverdue, startOfToday } from "@/lib/reminderLogic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

webpush.setVapidDetails(
  "mailto:alfarajhameed@gmail.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function alreadyNotifiedToday(reminder: Reminder): boolean {
  if (!reminder.last_notified_at) return false;
  return new Date(reminder.last_notified_at) >= startOfToday();
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: reminders } = await supabase.from("reminders").select("*").eq("active", true);
  const { data: checkins } = await supabase
    .from("checkins")
    .select("*")
    .gte("responded_at", startOfToday().toISOString());
  const { data: subtasks } = await supabase.from("subtasks").select("*").eq("active", true);
  const { data: subtaskCheckins } = await supabase
    .from("subtask_checkins")
    .select("*")
    .gte("responded_at", startOfToday().toISOString());
  const { data: subscriptions } = await supabase.from("push_subscriptions").select("*");

  if (!reminders || !subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, note: "no reminders or no subscriptions" });
  }

  let sent = 0;

  for (const reminder of reminders as Reminder[]) {
    if (alreadyNotifiedToday(reminder)) continue;

    const overdue = daysOverdue(
      reminder,
      (checkins as Checkin[]) || [],
      (subtasks as Subtask[]) || [],
      (subtaskCheckins as SubtaskCheckin[]) || []
    );
    const dueNow = isDueToday(reminder);
    const done = isDoneToday(
      reminder,
      (checkins as Checkin[]) || [],
      (subtasks as Subtask[]) || [],
      (subtaskCheckins as SubtaskCheckin[]) || []
    );

    if (done) continue;
    if (!dueNow && overdue === 0) continue;

    const body =
      overdue > 0
        ? `${reminder.title} — ${overdue} ${overdue === 1 ? "day" : "days"} overdue`
        : reminder.title;

    const payload = JSON.stringify({ title: "Rembr", body, url: "/" });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
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
