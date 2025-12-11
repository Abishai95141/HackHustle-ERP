export type AppRole = 'super_admin' | 'participant' | 'volunteer' | 'judge';
export type ScanType = 'entry' | 'exit';
export type QueryStatus = 'open' | 'in_progress' | 'resolved';
export type QueryCategory = 'wifi' | 'bug' | 'mentor_help' | 'logistics' | 'other';

export interface Team {
  id: string;
  team_name: string;
  team_code: string;
  table_number: string | null;
  total_score: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  team_id: string | null;
  qr_token: string;
  is_inside_venue: boolean;
  last_scan_timestamp: string | null;
  tshirt_size: string | null;
  dietary_restrictions: string | null;
  checked_in_day1: boolean;
  created_at: string;
  updated_at: string;
  team?: Team;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface AttendanceLog {
  id: string;
  user_id: string;
  scan_type: ScanType;
  timestamp: string;
  scanned_by_staff_id: string | null;
  profile?: Profile;
}

export interface MealSession {
  id: string;
  meal_type: string;
  display_name: string;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MealTransaction {
  id: string;
  user_id: string;
  meal_type: string;
  timestamp: string;
  scanned_by_staff_id: string | null;
  profile?: Profile;
}

export interface JudgeAssignment {
  id: string;
  judge_id: string;
  team_id: string;
  round_name: string;
  team?: Team;
}

export interface JudgeScore {
  id: string;
  judge_id: string;
  team_id: string;
  round_name: string;
  score_innovation: number | null;
  score_feasibility: number | null;
  score_code_quality: number | null;
  score_presentation: number | null;
  total_score: number;
  created_at: string;
  updated_at: string;
  team?: Team;
}

export interface Query {
  id: string;
  user_id: string;
  team_id: string | null;
  category: QueryCategory;
  title: string;
  description: string | null;
  status: QueryStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface CSVParticipant {
  name: string;
  email: string;
  phone?: string;
  team_name: string;
  team_code: string;
  tshirt_size?: string;
  dietary_restrictions?: string;
}