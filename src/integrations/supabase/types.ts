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
      character_feat_subfeats: {
        Row: {
          character_feat_id: string
          deleted_at: string | null
          id: string
          slot: number
          subfeat_id: string
          updated_at: string
        }
        Insert: {
          character_feat_id: string
          deleted_at?: string | null
          id?: string
          slot: number
          subfeat_id: string
          updated_at?: string
        }
        Update: {
          character_feat_id?: string
          deleted_at?: string | null
          id?: string
          slot?: number
          subfeat_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_feat_subfeats_character_feat_id_fkey"
            columns: ["character_feat_id"]
            isOneToOne: false
            referencedRelation: "character_feats"
            referencedColumns: ["id"]
          },
        ]
      }
      character_feats: {
        Row: {
          character_id: string
          deleted_at: string | null
          feat_id: string
          id: string
          is_free: boolean
          level: number
          note: string | null
          updated_at: string
        }
        Insert: {
          character_id: string
          deleted_at?: string | null
          feat_id: string
          id?: string
          is_free?: boolean
          level: number
          note?: string | null
          updated_at?: string
        }
        Update: {
          character_id?: string
          deleted_at?: string | null
          feat_id?: string
          id?: string
          is_free?: boolean
          level?: number
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_feats_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          portrait_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          portrait_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          portrait_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feat_overrides: {
        Row: {
          feat_id: string
          field: string
          id: string
          updated_at: string
          value: Json
        }
        Insert: {
          feat_id: string
          field: string
          id?: string
          updated_at?: string
          value: Json
        }
        Update: {
          feat_id?: string
          field?: string
          id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      game_players: {
        Row: {
          character_id: string | null
          deleted_at: string | null
          game_id: string
          id: string
          joined_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          character_id?: string | null
          deleted_at?: string | null
          game_id: string
          id?: string
          joined_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          character_id?: string | null
          deleted_at?: string | null
          game_id?: string
          id?: string
          joined_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_players_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          current_section: string | null
          deleted_at: string | null
          host_user_id: string
          id: string
          join_code: string
          scenario_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_section?: string | null
          deleted_at?: string | null
          host_user_id: string
          id?: string
          join_code: string
          scenario_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_section?: string | null
          deleted_at?: string | null
          host_user_id?: string
          id?: string
          join_code?: string
          scenario_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scenario_overrides: {
        Row: {
          field: string
          id: string
          scenario_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          field: string
          id?: string
          scenario_id: string
          updated_at?: string
          value: Json
        }
        Update: {
          field?: string
          id?: string
          scenario_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      translations: {
        Row: {
          id: string
          key: string
          locale: string
          screen: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          locale?: string
          screen: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          locale?: string
          screen?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          deleted_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          deleted_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          deleted_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "user" | "game_master"
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
      app_role: ["owner", "admin", "user", "game_master"],
    },
  },
} as const
