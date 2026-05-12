// ============================================================
// DATABASE TYPES — gegenereerd vanuit Supabase schema
// ============================================================

export type UserRole = "tapper" | "admin";
export type ShiftType = "tapavond" | "feestje";
export type ShiftStatus = "concept" | "published";
export type AssignmentStatus = "assigned" | "confirmed" | "declined" | "open";
export type ShiftRole = "tapper" | "bonnenkassa";
export type NotificationType =
  | "roster_published"
  | "reminder_2weeks"
  | "reminder_1week"
  | "open_shift"
  | "shift_claimed"
  | "shift_cancelled"
  | "admin_message";
export type InviteStatus = "pending" | "used" | "expired";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  preferred_frequency: number; // 1-100 per year
  preferred_days: ("wednesday" | "friday" | "saturday")[];
  preferred_roles: ShiftRole[];
  wants_parties: boolean;
  language: "nl" | "en";
  phone?: string;
  unavailable_months?: number[];
  created_at: string;
  updated_at: string;
}

export interface TapperPreference {
  id: string;
  user_id: string;
  preferred_tapper_id: string;
  order: number; // 1, 2, or 3
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  date: string; // ISO date
  type: ShiftType;
  created_by: string;
  created_at: string;
}

export interface Shift {
  id: string;
  event_id: string;
  title: string;
  date: string; // ISO date
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  type: ShiftType;
  role: ShiftRole;
  max_tappers: number;
  status: ShiftStatus;
  admin_note?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  event?: Event;
  assignments?: ShiftAssignment[];
}

export interface ShiftAssignment {
  id: string;
  shift_id: string;
  user_id: string;
  status: AssignmentStatus;
  confirmed_at?: string;
  declined_at?: string;
  created_at: string;
  // Joined
  shift?: Shift;
  profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  shift_id?: string;
  created_at: string;
}

export interface AdminMessage {
  id: string;
  title: string;
  body: string;
  created_by: string;
  created_at: string;
  shift_id?: string;
}

export interface InviteToken {
  id: string;
  token: string;
  created_by: string;
  used_by?: string;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
}

// ── API Response types ──
export interface ApiResponse<T = void> {
  data?: T;
  error?: string;
}

export interface ShiftWithDetails extends Shift {
  assignments: (ShiftAssignment & { profile: Profile })[];
  openSpots: number;
  myAssignment?: ShiftAssignment;
}

export interface UserStats {
  totalShiftsThisYear: number;
  targetShifts: number;
  progressPercent: number;
  leaderboardRank: number;
}
