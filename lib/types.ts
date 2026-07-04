export type Cadence = "daily" | "days_of_week" | "interval";

export type ReminderType = "simple" | "target";

export interface Reminder {
  id: string;
  title: string;
  cadence: Cadence;
  interval_days: number | null;
  days_of_week: number[] | null;
  type: ReminderType;
  target_value: number | null;
  target_unit: string | null;
  created_at: string;
  active: boolean;
  last_notified_at: string | null;
  assigned_label: string | null;
}

export interface Checkin {
  id: string;
  reminder_id: string;
  responded_at: string;
  raw_response: string | null;
  parsed_value: number | null;
  completed: boolean;
}
