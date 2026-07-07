import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  const now = new Date();
  const nowContext = `Current date/time: ${now.toISOString()} (${now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  })})`;

  const systemPrompt = `You convert a person's plain-English description of a reminder into strict JSON matching this exact shape:

{
  "title": string,
  "cadence": "daily" | "days_of_week" | "interval" | "once",
  "days_of_week": number[] | null,   // 0=Sun,1=Mon,...6=Sat — only when cadence is "days_of_week"
  "interval_days": number | null,     // only when cadence is "interval"
  "due_at": string | null,            // ISO 8601 datetime — only when cadence is "once"
  "type": "simple" | "target" | "checklist",
  "target_value": number | null,      // only when type is "target"
  "target_unit": string | null,       // only when type is "target", e.g. "ml", "pages", "reps"
  "assigned_label": string | null,    // a person's name if mentioned, else null
  "subtasks": string[] | null         // only when type is "checklist" — the list of items
}

Rules:
- ${nowContext}
- Resolve relative dates/times ("tomorrow", "next Friday", "at 6pm") against the current date/time given above.
- If someone describes a goal with a number and unit (e.g. "drink 3 liters of water", "read 20 pages"), use type "target" and convert units sensibly (liters -> ml is fine, keep it in the unit the person said if ambiguous).
- If someone lists multiple items that must all be done (e.g. "laundry: whites, mix, baby clothes"), use type "checklist" with those items as subtasks, and the overall task name as the title.
- Otherwise use type "simple".
- Default cadence to "daily" if no frequency is mentioned at all.
- Output ONLY the JSON object. No markdown fences, no explanation, no preamble.`;

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
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: "user", content: text }]
      })
    });

    const data = await response.json();
    const raw = data?.content?.find((b: any) => b.type === "text")?.text?.trim() || "{}";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    if (!parsed || !parsed.title) {
      return NextResponse.json({ error: "Could not understand that — try rephrasing." }, { status: 422 });
    }

    return NextResponse.json({ parsed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
