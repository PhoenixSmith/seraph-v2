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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: Database["public"]["Enums"]["achievement_category"]
          created_at: string | null
          description: string
          icon: string
          id: string
          key: string
          name: string
          requirement: Json
          xp_reward: number
        }
        Insert: {
          category: Database["public"]["Enums"]["achievement_category"]
          created_at?: string | null
          description: string
          icon: string
          id?: string
          key: string
          name: string
          requirement: Json
          xp_reward?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["achievement_category"]
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          key?: string
          name?: string
          requirement?: Json
          xp_reward?: number
        }
        Relationships: []
      }
      chapter_completions: {
        Row: {
          book: string
          chapter: number
          completed_at: string | null
          id: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          book: string
          chapter: number
          completed_at?: string | null
          id?: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          book?: string
          chapter?: number
          completed_at?: string | null
          id?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapter_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invites: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          invited_by_user_id: string
          invited_user_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["invite_status"]
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          invited_by_user_id: string
          invited_user_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          invited_by_user_id?: string
          invited_user_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invites_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          group_id: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          group_id: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          group_id?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_activities_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_level_thresholds: {
        Row: {
          color: string
          icon: string | null
          id: string
          level: string
          level_order: number
          min_weekly_xp: number
        }
        Insert: {
          color: string
          icon?: string | null
          id?: string
          level: string
          level_order: number
          min_weekly_xp: number
        }
        Update: {
          color?: string
          icon?: string | null
          id?: string
          level?: string
          level_order?: number
          min_weekly_xp?: number
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string | null
          current_level: string | null
          description: string | null
          id: string
          invite_code: string | null
          leader_id: string
          level_updated_at: string | null
          name: string
          week_start_date: string | null
          weekly_xp: number | null
        }
        Insert: {
          created_at?: string | null
          current_level?: string | null
          description?: string | null
          id?: string
          invite_code?: string | null
          leader_id: string
          level_updated_at?: string | null
          name: string
          week_start_date?: string | null
          weekly_xp?: number | null
        }
        Update: {
          created_at?: string | null
          current_level?: string | null
          description?: string | null
          id?: string
          invite_code?: string | null
          leader_id?: string
          level_updated_at?: string | null
          name?: string
          week_start_date?: string | null
          weekly_xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_config: Json | null
          avatar_url: string | null
          created_at: string | null
          current_streak: number | null
          current_tier: string | null
          email: string | null
          email_verified_at: string | null
          id: string
          is_anonymous: boolean | null
          last_read_date: string | null
          longest_streak: number | null
          name: string | null
          total_xp: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_config?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          current_streak?: string | null
          current_tier?: string | null
          email?: string | null
          email_verified_at?: string | null
          id: string
          is_anonymous?: boolean | null
          last_read_date?: string | null
          longest_streak?: number | null
          name?: string | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_config?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          current_streak?: number | null
          current_tier?: string | null
          email?: string | null
          email_verified_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          last_read_date?: string | null
          longest_streak?: number | null
          name?: string | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rolling_xp: {
        Row: {
          date: string
          id: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          date: string
          id?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          date?: string
          id?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "rolling_xp_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_thresholds: {
        Row: {
          color: string
          id: string
          min_xp: number
          tier: string
          tier_order: number
        }
        Insert: {
          color: string
          id?: string
          min_xp: number
          tier: string
          tier_order: number
        }
        Update: {
          color?: string
          id?: string
          min_xp?: number
          tier?: string
          tier_order?: number
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verse_notes: {
        Row: {
          id: string
          user_id: string
          book: string
          chapter: number
          verse: number
          content: string
          is_private: boolean
          group_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          book: string
          chapter: number
          verse: number
          content: string
          is_private?: boolean
          group_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          book?: string
          chapter?: number
          verse?: number
          content?: string
          is_private?: boolean
          group_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verse_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_notes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      verse_note_replies: {
        Row: {
          id: string
          note_id: string
          user_id: string
          content: string
          created_at: string | null
        }
        Insert: {
          id?: string
          note_id: string
          user_id: string
          content: string
          created_at?: string | null
        }
        Update: {
          id?: string
          note_id?: string
          user_id?: string
          content?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verse_note_replies_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "verse_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_note_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_invite: { Args: { p_invite_id: string }; Returns: undefined }
      cleanup_old_rolling_xp: { Args: never; Returns: number }
      complete_chapter: {
        Args: { p_book: string; p_chapter: number }
        Returns: Json
      }
      create_group: { Args: { p_name: string; p_description?: string }; Returns: string }
      delete_group: { Args: { p_group_id: string }; Returns: undefined }
      get_achievement_stats: { Args: never; Returns: Json }
      get_achievements_with_status: {
        Args: never
        Returns: {
          category: string
          description: string
          icon: string
          id: string
          key: string
          name: string
          unlocked: boolean
          unlocked_at: string
          xp_reward: number
        }[]
      }
      get_book_progress: {
        Args: { p_book: string; p_total_chapters: number }
        Returns: Json
      }
      get_completed_chapters_for_book: {
        Args: { p_book: string }
        Returns: number[]
      }
      get_current_user: {
        Args: never
        Returns: {
          avatar_url: string
          current_streak: number
          current_tier: string
          email: string
          id: string
          last_read_date: string
          longest_streak: number
          name: string
          total_xp: number
        }[]
      }
      get_current_user_tier: { Args: never; Returns: Json }
      get_global_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          is_current_user: boolean
          name: string
          rank: number
          rolling_xp: number
          tier: string
          tier_color: string
          user_id: string
        }[]
      }
      get_group: { Args: { p_group_id: string }; Returns: Json }
      get_group_activity_feed: {
        Args: { p_group_id: string; p_limit?: number }
        Returns: {
          id: string
          user_id: string
          user_name: string
          user_avatar_url: string
          activity_type: string
          metadata: Json
          created_at: string
        }[]
      }
      get_group_level_info: { Args: { p_group_id: string }; Returns: Json }
      get_group_level_thresholds: {
        Args: Record<string, never>
        Returns: {
          color: string
          level: string
          level_order: number
          min_weekly_xp: number
        }[]
      }
      get_group_statistics: { Args: { p_group_id: string }; Returns: Json }
      get_group_leaderboard: {
        Args: { p_group_id: string }
        Returns: {
          avatar_url: string
          current_streak: number
          is_current_user: boolean
          is_leader: boolean
          name: string
          rank: number
          total_xp: number
          user_id: string
        }[]
      }
      get_group_pending_invites: {
        Args: { p_group_id: string }
        Returns: {
          created_at: string
          id: string
          invited_user_email: string
          invited_user_name: string
        }[]
      }
      get_pending_invites: {
        Args: never
        Returns: {
          created_at: string
          group_id: string
          group_name: string
          id: string
          invited_by_name: string
        }[]
      }
      get_profile_stats: { Args: Record<string, never>; Returns: Json }
      get_rolling_xp_history: {
        Args: { p_days?: number }
        Returns: {
          date: string
          xp: number
        }[]
      }
      invite_to_group: {
        Args: { p_group_id: string; p_identifier: string }
        Returns: Json
      }
      join_group_by_code: { Args: { p_invite_code: string }; Returns: Json }
      leave_group: { Args: { p_group_id: string }; Returns: undefined }
      list_my_groups: {
        Args: never
        Returns: {
          created_at: string
          description: string | null
          id: string
          is_leader: boolean
          leader_id: string
          member_count: number
          name: string
        }[]
      }
      recalculate_group_levels: { Args: Record<string, never>; Returns: number }
      recalculate_user_tier: { Args: { p_user_id: string }; Returns: string }
      regenerate_invite_code: { Args: { p_group_id: string }; Returns: Json }
      record_quiz_answer: {
        Args: { p_book: string; p_chapter: number; p_correct: boolean }
        Returns: Json
      }
      record_verse_read: { Args: never; Returns: Json }
      remove_member: {
        Args: { p_group_id: string; p_member_id: string }
        Returns: undefined
      }
      respond_to_invite: {
        Args: { p_accept: boolean; p_invite_id: string }
        Returns: undefined
      }
      transfer_leadership: {
        Args: { p_group_id: string; p_new_leader_id: string }
        Returns: undefined
      }
      update_group: {
        Args: { p_group_id: string; p_name: string; p_description?: string }
        Returns: Json
      }
      create_verse_note: {
        Args: { p_book: string; p_chapter: number; p_verse: number; p_content: string; p_group_id?: string }
        Returns: Json
      }
      get_chapter_notes: {
        Args: { p_book: string; p_chapter: number; p_group_ids?: string[] }
        Returns: {
          id: string
          user_id: string
          user_name: string
          user_avatar_url: string
          user_avatar_config: Json
          verse: number
          content: string
          is_private: boolean
          group_id: string | null
          group_name: string | null
          created_at: string
          reply_count: number
        }[]
      }
      get_note_with_replies: {
        Args: { p_note_id: string }
        Returns: Json
      }
      add_note_reply: {
        Args: { p_note_id: string; p_content: string }
        Returns: Json
      }
      update_verse_note: {
        Args: { p_note_id: string; p_content: string }
        Returns: Json
      }
      delete_verse_note: {
        Args: { p_note_id: string }
        Returns: Json
      }
      share_note_to_group: {
        Args: { p_note_id: string; p_group_id: string }
        Returns: Json
      }
      make_note_private: {
        Args: { p_note_id: string }
        Returns: Json
      }
      delete_note_reply: {
        Args: { p_reply_id: string }
        Returns: Json
      }
    }
    Enums: {
      achievement_category:
        | "book_completion"
        | "streak"
        | "xp_milestone"
        | "special"
      invite_status: "pending" | "accepted" | "declined"
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
      achievement_category: [
        "book_completion",
        "streak",
        "xp_milestone",
        "special",
      ],
      invite_status: ["pending", "accepted", "declined"],
    },
  },
} as const
