export type Cadence = "daily" | "days_of_week" | "interval";

export type ReminderType = "simple" | "target";

export interface Reminder {
  id: string;
  title: string;
  cadence: Cadence;
  interval_days: number | null; // used when cadence === 'interval'
  days_of_week: number[] | null; // used when cadence === 'days_of_week', 0=Sun..6=Sat
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
