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
      achievement_progress: {
        Row: {
          achievement_id: string
          created_at: string
          current_value: number
          id: string
          last_updated: string
          metadata: Json | null
          target_value: number
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          current_value?: number
          id?: string
          last_updated?: string
          metadata?: Json | null
          target_value?: number
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          current_value?: number
          id?: string
          last_updated?: string
          metadata?: Json | null
          target_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_progress_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          anti_cheat_rules: Json | null
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          is_hidden: boolean
          name: string
          requirement_type: string
          requirement_value: number
          reward_type: string
          reward_value: Json
          sort_order: number
          tier: string
          unlock_formula: string | null
        }
        Insert: {
          anti_cheat_rules?: Json | null
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_hidden?: boolean
          name: string
          requirement_type: string
          requirement_value: number
          reward_type?: string
          reward_value?: Json
          sort_order?: number
          tier?: string
          unlock_formula?: string | null
        }
        Update: {
          anti_cheat_rules?: Json | null
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_hidden?: boolean
          name?: string
          requirement_type?: string
          requirement_value?: number
          reward_type?: string
          reward_value?: Json
          sort_order?: number
          tier?: string
          unlock_formula?: string | null
        }
        Relationships: []
      }
      global_topic_stats: {
        Row: {
          avg_accuracy: number
          avg_time_seconds: number
          id: string
          topic_id: string
          total_attempts: number
          total_correct: number
          updated_at: string
        }
        Insert: {
          avg_accuracy?: number
          avg_time_seconds?: number
          id?: string
          topic_id: string
          total_attempts?: number
          total_correct?: number
          updated_at?: string
        }
        Update: {
          avg_accuracy?: number
          avg_time_seconds?: number
          id?: string
          topic_id?: string
          total_attempts?: number
          total_correct?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_topic_stats_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: true
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_stats: {
        Row: {
          average_score: number
          best_score: number
          created_at: string
          current_streak: number
          display_name: string
          id: string
          last_activity_date: string | null
          longest_streak: number
          total_correct: number
          total_questions: number
          total_quizzes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_score?: number
          best_score?: number
          created_at?: string
          current_streak?: number
          display_name?: string
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_correct?: number
          total_questions?: number
          total_quizzes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_score?: number
          best_score?: number
          created_at?: string
          current_streak?: number
          display_name?: string
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_correct?: number
          total_questions?: number
          total_quizzes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_ai_generated: boolean
          todo_id: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          todo_id: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          todo_id?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          leaderboard_visibility: string
          name: string | null
          profile_highlights: Json | null
          streak_protections: number
          total_xp: number
          unlocked_modes: Json | null
          updated_at: string
          user_id: string
          xp_multiplier: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          leaderboard_visibility?: string
          name?: string | null
          profile_highlights?: Json | null
          streak_protections?: number
          total_xp?: number
          unlocked_modes?: Json | null
          updated_at?: string
          user_id: string
          xp_multiplier?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          leaderboard_visibility?: string
          name?: string | null
          profile_highlights?: Json | null
          streak_protections?: number
          total_xp?: number
          unlocked_modes?: Json | null
          updated_at?: string
          user_id?: string
          xp_multiplier?: number
        }
        Relationships: []
      }
      question_attempts: {
        Row: {
          attempt_number: number
          created_at: string
          difficulty_level: string
          id: string
          is_correct: boolean
          question_text: string
          quiz_id: string
          time_taken_seconds: number
          todo_id: string
          topic_id: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          difficulty_level?: string
          id?: string
          is_correct: boolean
          question_text: string
          quiz_id: string
          time_taken_seconds?: number
          todo_id: string
          topic_id?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          difficulty_level?: string
          id?: string
          is_correct?: boolean
          question_text?: string
          quiz_id?: string
          time_taken_seconds?: number
          todo_id?: string
          topic_id?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          answers: Json
          correct_answers: number
          created_at: string
          difficulty: string | null
          id: string
          previous_score: number | null
          score: number
          time_taken_seconds: number | null
          todo_id: string
          topic_id: string | null
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json
          correct_answers: number
          created_at?: string
          difficulty?: string | null
          id?: string
          previous_score?: number | null
          score: number
          time_taken_seconds?: number | null
          todo_id: string
          topic_id?: string | null
          total_questions: number
          user_id: string
        }
        Update: {
          answers?: Json
          correct_answers?: number
          created_at?: string
          difficulty?: string | null
          id?: string
          previous_score?: number | null
          score?: number
          time_taken_seconds?: number | null
          todo_id?: string
          topic_id?: string | null
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          questions: Json
          todo_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          questions?: Json
          todo_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          questions?: Json
          todo_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_queue: {
        Row: {
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_completed: boolean
          is_dismissed: boolean
          priority: number
          recommendation_type: string
          title: string
          todo_id: string | null
          topic_id: string
          user_id: string
          video_channel: string | null
          video_id: string | null
          video_title: string | null
          weakness_score: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_completed?: boolean
          is_dismissed?: boolean
          priority?: number
          recommendation_type: string
          title: string
          todo_id?: string | null
          topic_id: string
          user_id: string
          video_channel?: string | null
          video_id?: string | null
          video_title?: string | null
          weakness_score?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_completed?: boolean
          is_dismissed?: boolean
          priority?: number
          recommendation_type?: string
          title?: string
          todo_id?: string | null
          topic_id?: string
          user_id?: string
          video_channel?: string | null
          video_id?: string | null
          video_title?: string | null
          weakness_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_queue_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_queue_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      subtask_videos: {
        Row: {
          channel: string
          created_at: string
          engagement_score: number | null
          id: string
          order_index: number
          reason: string | null
          subtask_id: string
          title: string
          user_id: string
          video_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          engagement_score?: number | null
          id?: string
          order_index?: number
          reason?: string | null
          subtask_id: string
          title: string
          user_id: string
          video_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          engagement_score?: number | null
          id?: string
          order_index?: number
          reason?: string | null
          subtask_id?: string
          title?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtask_videos_subtask_id_fkey"
            columns: ["subtask_id"]
            isOneToOne: false
            referencedRelation: "subtasks"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          created_at: string
          id: string
          order_index: number
          title: string
          todo_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          title: string
          todo_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          title?: string
          todo_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
          video_id: string | null
          video_url: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
          video_id?: string | null
          video_url?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          video_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      topic_mastery: {
        Row: {
          average_score: number
          best_score: number
          created_at: string
          fastest_completion: number | null
          high_score_streak: number
          id: string
          quizzes_completed: number
          topic_id: string
          total_correct: number
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_score?: number
          best_score?: number
          created_at?: string
          fastest_completion?: number | null
          high_score_streak?: number
          id?: string
          quizzes_completed?: number
          topic_id: string
          total_correct?: number
          total_questions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_score?: number
          best_score?: number
          created_at?: string
          fastest_completion?: number | null
          high_score_streak?: number
          id?: string
          quizzes_completed?: number
          topic_id?: string
          total_correct?: number
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_mastery_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          progress: number
          progress_max: number
          reward_claimed: boolean
          reward_expires_at: string | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          progress?: number
          progress_max?: number
          reward_claimed?: boolean
          reward_expires_at?: string | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          progress?: number
          progress_max?: number
          reward_claimed?: boolean
          reward_expires_at?: string | null
          unlocked_at?: string
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
        ]
      }
      user_credits: {
        Row: {
          created_at: string
          credits_remaining: number
          credits_used: number
          id: string
          last_reset_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_remaining?: number
          credits_used?: number
          id?: string
          last_reset_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_remaining?: number
          credits_used?: number
          id?: string
          last_reset_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_rewards: {
        Row: {
          achievement_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          reward_type: string
          reward_value: Json
          updated_at: string
          user_id: string
          uses_remaining: number | null
        }
        Insert: {
          achievement_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reward_type: string
          reward_value: Json
          updated_at?: string
          user_id: string
          uses_remaining?: number | null
        }
        Update: {
          achievement_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reward_type?: string
          reward_value?: Json
          updated_at?: string
          user_id?: string
          uses_remaining?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_rewards_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_topic_performance: {
        Row: {
          avg_time_seconds: number
          correct_answers: number
          created_at: string
          id: string
          last_updated: string
          repeated_mistakes: number
          strength_status: string
          topic_id: string
          total_questions: number
          total_time_seconds: number
          user_id: string
          weakness_score: number
          wrong_on_easy: number
          wrong_on_hard: number
          wrong_on_medium: number
        }
        Insert: {
          avg_time_seconds?: number
          correct_answers?: number
          created_at?: string
          id?: string
          last_updated?: string
          repeated_mistakes?: number
          strength_status?: string
          topic_id: string
          total_questions?: number
          total_time_seconds?: number
          user_id: string
          weakness_score?: number
          wrong_on_easy?: number
          wrong_on_hard?: number
          wrong_on_medium?: number
        }
        Update: {
          avg_time_seconds?: number
          correct_answers?: number
          created_at?: string
          id?: string
          last_updated?: string
          repeated_mistakes?: number
          strength_status?: string
          topic_id?: string
          total_questions?: number
          total_time_seconds?: number
          user_id?: string
          weakness_score?: number
          wrong_on_easy?: number
          wrong_on_hard?: number
          wrong_on_medium?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_topic_performance_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      video_progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          last_position_seconds: number
          progress_percent: number
          todo_id: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          last_position_seconds?: number
          progress_percent?: number
          todo_id: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          last_position_seconds?: number
          progress_percent?: number
          todo_id?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_topic_analysis: {
        Row: {
          correct_count: number
          created_at: string
          id: string
          is_weak_topic: boolean
          mastery_score: number
          questions_count: number
          todo_id: string
          topic_id: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          id?: string
          is_weak_topic?: boolean
          mastery_score?: number
          questions_count?: number
          todo_id: string
          topic_id: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          id?: string
          is_weak_topic?: boolean
          mastery_score?: number
          questions_count?: number
          todo_id?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_topic_analysis_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_topic_analysis_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_achievements: {
        Args: { uid: string }
        Returns: {
          achievement_id: string
          achievement_name: string
          just_unlocked: boolean
        }[]
      }
      check_achievements_v2: {
        Args: { uid: string }
        Returns: {
          achievement_id: string
          achievement_name: string
          category: string
          just_unlocked: boolean
          progress: number
          progress_max: number
          reward_type: string
          reward_value: Json
          tier: string
        }[]
      }
      check_and_reset_credits: {
        Args: { uid: string }
        Returns: {
          credits_remaining: number
          credits_used: number
          was_reset: boolean
        }[]
      }
      consume_credits: {
        Args: { amount?: number; uid: string }
        Returns: boolean
      }
      update_achievement_progress: {
        Args: {
          p_achievement_id: string
          p_current_value: number
          p_metadata?: Json
          p_target_value: number
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
