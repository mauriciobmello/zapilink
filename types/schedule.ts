export type BookingStatus = "pending" | "approved" | "declined";
export type ExceptionType = "blocked" | "capacity_override";
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ScheduleEvent {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  default_capacity: number;
  location: string | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityRule {
  id: string;
  profile_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface AvailabilityException {
  id: string;
  profile_id: string;
  date: string;
  type: ExceptionType;
  start_time: string | null;
  end_time: string | null;
  capacity: number | null;
  created_at: string;
}

export interface GoogleCalendarConnection {
  id: string;
  profile_id: string;
  google_email: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  profile_id: string;
  event_id: string | null;
  slot_date: string;
  slot_start_time: string;
  slot_end_time: string;
  invitee_name: string;
  invitee_email: string;
  invitee_phone: string | null;
  status: BookingStatus;
  approval_token: string;
  google_calendar_event_id: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface AvailableSlot {
  date: string;
  start_time: string;
  end_time: string;
  remaining_capacity: number;
}

export interface BookedCount {
  slot_date: string;
  slot_start_time: string;
  count: number;
}