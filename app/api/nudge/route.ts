import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Reminder, Checkin } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { reminder_id } = await req.json();

  const { data: reminder } = await supabase
    .from("reminders")
    .select("*")
    .eq("id", reminder_id)
    .single();

  if (!reminder) {
    return NextResponse.json({ error: "reminder not found" }, { status: 404 });
  }

  // Last 14 days of check-ins for this reminder, so the model has real pattern to work with
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const { data: recentCheckins } = await supabase
    .from("checkins")
    .select("*")
    .eq("reminder_id", reminder_id)
    .gte("responded_at", since.toISOString())
    .order("responded_at", { ascending: true });

  const r = reminder as Reminder;
  const checkins = (recentCheckins as Checkin[]) || [];

  const historyLines = checkins
    .map((c) => `${c.responded_at.slice(0, 10)}: ${c.raw_response || (c.completed ? "done" : "")}`)
    .join("\n");

  const today = new Date();
  const todayTotal = checkins
    .filter((c) => c.responded_at.slice(0, 10) === today.toISOString().slice(0, 10))
    .reduce((sum, c) => sum + (c.parsed_value || 0), 0);

  let contextSummary = `Reminder: "${r.title}"\nType: ${r.type}\n`;
  if (r.type === "target") {
    contextSummary += `Goal: ${r.target_value} ${r.target_unit} per period. So far today: ${todayTotal} ${r.target_unit}.\n`;
  }
  if (r.last_completed_at) {
    contextSummary += `Last fully completed: ${r.last_completed_at.slice(0, 10)}.\n`;
  } else {
    contextSummary += `Never yet marked complete.\n`;
  }
  contextSummary += `Recent history (last 14 days):\n${historyLines || "(no check-ins yet)"}`;

  const systemPrompt = `You write short, warm nudge messages for Rembr, a personal reminder app. 
Your voice: like a caring companion who's actually paying attention, not a corporate notification. 
Rules:
- One sentence only, under 15 words.
- Be specific to the data given — reference actual numbers or patterns when relevant.
- Never generic filler like "You've got this!" or "Stay motivated!" unless genuinely earned by the pattern.
- No emoji, no exclamation-mark overload — at most one.
- If they're behind pace today, gently note it. If they have a good streak, acknowledge it specifically.
- Output ONLY the message text, nothing else — no quotes, no preamble.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 60,
        system: systemPrompt,
        messages: [{ role: "user", content: contextSummary }]
      })
    });

    const data = await response.json();
    const message =
      data?.content?.find((block: any) => block.type === "text")?.text?.trim() || null;

    if (message) {
      await supabase
        .from("reminders")
        .update({ ai_message: message, ai_message_at: new Date().toISOString() })
        .eq("id", reminder_id);
    }

    return NextResponse.json({ message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
