export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance_logs: {
        Row: {
          id: string
          scan_type: Database["public"]["Enums"]["scan_type"]
          scanned_by_staff_id: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          id?: string
          scan_type: Database["public"]["Enums"]["scan_type"]
          scanned_by_staff_id?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          id?: string
          scan_type?: Database["public"]["Enums"]["scan_type"]
          scanned_by_staff_id?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_scanned_by_staff_id_fkey"
            columns: ["scanned_by_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_assignments: {
        Row: {
          id: string
          judge_id: string
          round_name: string
          team_id: string
        }
        Insert: {
          id?: string
          judge_id: string
          round_name?: string
          team_id: string
        }
        Update: {
          id?: string
          judge_id?: string
          round_name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_assignments_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_scores: {
        Row: {
          created_at: string | null
          id: string
          judge_id: string
          round_name: string
          score_code_quality: number | null
          score_feasibility: number | null
          score_innovation: number | null
          score_presentation: number | null
          team_id: string
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          judge_id: string
          round_name?: string
          score_code_quality?: number | null
          score_feasibility?: number | null
          score_innovation?: number | null
          score_presentation?: number | null
          team_id: string
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          judge_id?: string
          round_name?: string
          score_code_quality?: number | null
          score_feasibility?: number | null
          score_innovation?: number | null
          score_presentation?: number | null
          team_id?: string
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "judge_scores_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_sessions: {
        Row: {
          created_at: string | null
          display_name: string
          end_time: string | null
          id: string
          is_active: boolean | null
          meal_type: string
          start_time: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          meal_type: string
          start_time?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          meal_type?: string
          start_time?: string | null
        }
        Relationships: []
      }
      meal_transactions: {
        Row: {
          id: string
          meal_type: string
          scanned_by_staff_id: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          id?: string
          meal_type: string
          scanned_by_staff_id?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          id?: string
          meal_type?: string
          scanned_by_staff_id?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_transactions_scanned_by_staff_id_fkey"
            columns: ["scanned_by_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          checked_in_day1: boolean | null
          created_at: string | null
          dietary_restrictions: string | null
          email: string
          id: string
          is_inside_venue: boolean | null
          last_scan_timestamp: string | null
          name: string
          phone: string | null
          qr_token: string
          team_id: string | null
          tshirt_size: string | null
          updated_at: string | null
        }
        Insert: {
          checked_in_day1?: boolean | null
          created_at?: string | null
          dietary_restrictions?: string | null
          email: string
          id: string
          is_inside_venue?: boolean | null
          last_scan_timestamp?: string | null
          name: string
          phone?: string | null
          qr_token?: string
          team_id?: string | null
          tshirt_size?: string | null
          updated_at?: string | null
        }
        Update: {
          checked_in_day1?: boolean | null
          created_at?: string | null
          dietary_restrictions?: string | null
          email?: string
          id?: string
          is_inside_venue?: boolean | null
          last_scan_timestamp?: string | null
          name?: string
          phone?: string | null
          qr_token?: string
          team_id?: string | null
          tshirt_size?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      queries: {
        Row: {
          admin_notes: string | null
          category: Database["public"]["Enums"]["query_category"]
          created_at: string | null
          description: string | null
          id: string
          status: Database["public"]["Enums"]["query_status"]
          team_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category?: Database["public"]["Enums"]["query_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["query_status"]
          team_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: Database["public"]["Enums"]["query_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["query_status"]
          team_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          table_number: string | null
          team_code: string
          team_name: string
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          table_number?: string | null
          team_code: string
          team_name: string
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          table_number?: string | null
          team_code?: string
          team_name?: string
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "participant" | "volunteer" | "judge"
      query_category: "wifi" | "bug" | "mentor_help" | "logistics" | "other"
      query_status: "open" | "in_progress" | "resolved"
      scan_type: "entry" | "exit"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "participant", "volunteer", "judge"],
      query_category: ["wifi", "bug", "mentor_help", "logistics", "other"],
      query_status: ["open", "in_progress", "resolved"],
      scan_type: ["entry", "exit"],
    },
  },
} as const
