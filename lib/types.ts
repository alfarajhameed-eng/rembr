export type Cadence =
  | "daily"
  | "weekly"
  | "monthly"
  | "every_monday"
  | "every_other_day"
  | "custom";

export type ReminderType = "simple" | "target";

export interface Reminder {
  id: string;
  title: string;
  cadence: Cadence;
  type: ReminderType;
  target_value: number | null;
  target_unit: string | null;
  created_at: string;
  active: boolean;
}

export interface Checkin {
  id: string;
  reminder_id: string;
  responded_at: string;
  raw_response: string | null;
  parsed_value: number | null;
  completed: boolean;
}
