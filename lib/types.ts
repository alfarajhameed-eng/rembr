export type Cadence = "daily" | "days_of_week" | "interval" | "once";

export type ReminderType = "simple" | "target" | "checklist";

export interface Reminder {
  id: string;
  title: string;
  cadence: Cadence;
  interval_days: number | null;
  days_of_week: number[] | null;
  due_at: string | null; // used when cadence === 'once'
  type: ReminderType;
  target_value: number | null;
  target_unit: string | null;
  created_at: string;
  active: boolean;
  last_notified_at: string | null;
  last_completed_at: string | null;
  assigned_label: string | null;
  ai_message: string | null;
  ai_message_at: string | null;
}

export interface Checkin {
  id: string;
  reminder_id: string;
  responded_at: string;
  raw_response: string | null;
  parsed_value: number | null;
  completed: boolean;
}

export interface Subtask {
  id: string;
  reminder_id: string;
  title: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface SubtaskCheckin {
  id: string;
  subtask_id: string;
  responded_at: string;
}
