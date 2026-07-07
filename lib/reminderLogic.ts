import type { Reminder, Checkin, Subtask, SubtaskCheckin } from "./types";

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function startOfToday(): Date {
  return startOfDay(new Date());
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

// Is this reminder "due" at all today (ignoring completion)?
export function isDueToday(reminder: Reminder): boolean {
  const today = new Date();
  const todayDay = today.getDay();

  if (reminder.cadence === "once") {
    if (!reminder.due_at) return false;
    return daysBetween(today, new Date(reminder.due_at)) >= 0;
  }
  if (reminder.cadence === "daily") return true;
  if (reminder.cadence === "days_of_week") {
    return (reminder.days_of_week || []).includes(todayDay);
  }
  if (reminder.cadence === "interval") {
    const anchor = reminder.last_completed_at
      ? new Date(reminder.last_completed_at)
      : new Date(reminder.created_at);
    const interval = reminder.interval_days || 1;
    const since = daysBetween(today, anchor);
    return since >= 0 && since % interval === 0 ? true : since >= interval;
  }
  return false;
}

// Whether a simple/target reminder has been completed "today" (for recurring types)
// or completed at all (for one-time reminders).
export function isDoneToday(
  reminder: Reminder,
  checkins: Checkin[],
  subtasks?: Subtask[],
  subtaskCheckins?: SubtaskCheckin[]
): boolean {
  if (reminder.type === "checklist") {
    const mySubtasks = (subtasks || []).filter(
      (s) => s.reminder_id === reminder.id && s.active
    );
    if (mySubtasks.length === 0) return false;
    const today = startOfToday();
    return mySubtasks.every((s) =>
      (subtaskCheckins || []).some(
        (c) => c.subtask_id === s.id && new Date(c.responded_at) >= today
      )
    );
  }

  const mine = checkins.filter((c) => c.reminder_id === reminder.id);

  if (reminder.cadence === "once") {
    return mine.some((c) => c.completed);
  }

  if (reminder.type === "simple") {
    return mine.some((c) => c.completed);
  }
  if (reminder.type === "target" && reminder.target_value) {
    const total = mine.reduce((sum, c) => sum + (c.parsed_value || 0), 0);
    return total >= reminder.target_value;
  }
  return false;
}

// Find the most recent date (before today) this reminder was due, within the last 60 days.
function mostRecentDueDateBeforeToday(reminder: Reminder): Date | null {
  const today = startOfToday();

  if (reminder.cadence === "once") {
    if (!reminder.due_at) return null;
    const due = startOfDay(new Date(reminder.due_at));
    return due < today ? due : null;
  }

  if (reminder.cadence === "daily") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  if (reminder.cadence === "days_of_week") {
    for (let back = 1; back <= 7; back++) {
      const candidate = new Date(today);
      candidate.setDate(candidate.getDate() - back);
      if ((reminder.days_of_week || []).includes(candidate.getDay())) return candidate;
    }
    return null;
  }

  if (reminder.cadence === "interval") {
    const interval = reminder.interval_days || 1;
    const anchor = startOfDay(new Date(reminder.created_at));
    const daysSinceAnchor = daysBetween(today, anchor);
    if (daysSinceAnchor <= 0) return null;
    const periodsElapsed = Math.floor((daysSinceAnchor - 1) / interval);
    if (periodsElapsed < 0) return null;
    const due = new Date(anchor);
    due.setDate(due.getDate() + periodsElapsed * interval);
    return due < today ? due : null;
  }

  return null;
}

// Returns 0 if not overdue, otherwise the number of days overdue.
export function daysOverdue(
  reminder: Reminder,
  checkins: Checkin[],
  subtasks?: Subtask[],
  subtaskCheckins?: SubtaskCheckin[]
): number {
  if (isDoneToday(reminder, checkins, subtasks, subtaskCheckins)) return 0;

  const lastDue = mostRecentDueDateBeforeToday(reminder);
  if (!lastDue) return 0;

  if (reminder.last_completed_at) {
    const completedDay = startOfDay(new Date(reminder.last_completed_at));
    if (completedDay >= lastDue) return 0;
  }

  const today = startOfToday();
  return Math.max(0, daysBetween(today, lastDue));
}
