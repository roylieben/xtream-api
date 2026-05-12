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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          last_sync_live_at: string | null
          last_sync_series_at: string | null
          last_sync_vod_at: string | null
          proxy_password: string | null
          proxy_username: string | null
          sync_interval_live_minutes: number | null
          sync_interval_series_minutes: number | null
          sync_interval_vod_minutes: number | null
          updated_at: string | null
          xtream_host: string | null
          xtream_password: string | null
          xtream_username: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_sync_live_at?: string | null
          last_sync_series_at?: string | null
          last_sync_vod_at?: string | null
          proxy_password?: string | null
          proxy_username?: string | null
          sync_interval_live_minutes?: number | null
          sync_interval_series_minutes?: number | null
          sync_interval_vod_minutes?: number | null
          updated_at?: string | null
          xtream_host?: string | null
          xtream_password?: string | null
          xtream_username?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_sync_live_at?: string | null
          last_sync_series_at?: string | null
          last_sync_vod_at?: string | null
          proxy_password?: string | null
          proxy_username?: string | null
          sync_interval_live_minutes?: number | null
          sync_interval_series_minutes?: number | null
          sync_interval_vod_minutes?: number | null
          updated_at?: string | null
          xtream_host?: string | null
          xtream_password?: string | null
          xtream_username?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          enabled: boolean | null
          id: number
          name: string | null
          parent_id: string | null
          type: string
          upstream_id: string
        }
        Insert: {
          enabled?: boolean | null
          id?: number
          name?: string | null
          parent_id?: string | null
          type: string
          upstream_id: string
        }
        Update: {
          enabled?: boolean | null
          id?: number
          name?: string | null
          parent_id?: string | null
          type?: string
          upstream_id?: string
        }
        Relationships: []
      }
      live_streams: {
        Row: {
          added: string | null
          category_id: string | null
          created_at: string | null
          custom_sid: string | null
          direct_source: string | null
          epg_channel_id: string | null
          id: number
          name: string | null
          num: string | null
          raw: Json | null
          stream_icon: string | null
          tv_archive: string | null
          tv_archive_duration: string | null
          upstream_id: string
        }
        Insert: {
          added?: string | null
          category_id?: string | null
          created_at?: string | null
          custom_sid?: string | null
          direct_source?: string | null
          epg_channel_id?: string | null
          id?: number
          name?: string | null
          num?: string | null
          raw?: Json | null
          stream_icon?: string | null
          tv_archive?: string | null
          tv_archive_duration?: string | null
          upstream_id: string
        }
        Update: {
          added?: string | null
          category_id?: string | null
          created_at?: string | null
          custom_sid?: string | null
          direct_source?: string | null
          epg_channel_id?: string | null
          id?: number
          name?: string | null
          num?: string | null
          raw?: Json | null
          stream_icon?: string | null
          tv_archive?: string | null
          tv_archive_duration?: string | null
          upstream_id?: string
        }
        Relationships: []
      }
      series: {
        Row: {
          cast_text: string | null
          category_id: string | null
          cover: string | null
          created_at: string | null
          director: string | null
          genre: string | null
          id: number
          last_modified: string | null
          name: string | null
          num: string | null
          plot: string | null
          rating: string | null
          raw: Json | null
          release_date: string | null
          upstream_id: string
        }
        Insert: {
          cast_text?: string | null
          category_id?: string | null
          cover?: string | null
          created_at?: string | null
          director?: string | null
          genre?: string | null
          id?: number
          last_modified?: string | null
          name?: string | null
          num?: string | null
          plot?: string | null
          rating?: string | null
          raw?: Json | null
          release_date?: string | null
          upstream_id: string
        }
        Update: {
          cast_text?: string | null
          category_id?: string | null
          cover?: string | null
          created_at?: string | null
          director?: string | null
          genre?: string | null
          id?: number
          last_modified?: string | null
          name?: string | null
          num?: string | null
          plot?: string | null
          rating?: string | null
          raw?: Json | null
          release_date?: string | null
          upstream_id?: string
        }
        Relationships: []
      }
      series_info: {
        Row: {
          created_at: string | null
          episodes: Json | null
          id: number
          info: Json | null
          seasons: Json | null
          series_id: string
        }
        Insert: {
          created_at?: string | null
          episodes?: Json | null
          id?: number
          info?: Json | null
          seasons?: Json | null
          series_id: string
        }
        Update: {
          created_at?: string | null
          episodes?: Json | null
          id?: number
          info?: Json | null
          seasons?: Json | null
          series_id?: string
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          finished_at: string | null
          id: number
          items_processed: number | null
          message: string | null
          started_at: string | null
          status: string
          type: string
        }
        Insert: {
          finished_at?: string | null
          id?: number
          items_processed?: number | null
          message?: string | null
          started_at?: string | null
          status: string
          type: string
        }
        Update: {
          finished_at?: string | null
          id?: number
          items_processed?: number | null
          message?: string | null
          started_at?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      vod_info: {
        Row: {
          created_at: string | null
          id: number
          info: Json | null
          movie_data: Json | null
          vod_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          info?: Json | null
          movie_data?: Json | null
          vod_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          info?: Json | null
          movie_data?: Json | null
          vod_id?: string
        }
        Relationships: []
      }
      vod_streams: {
        Row: {
          added: string | null
          category_id: string | null
          container_extension: string | null
          created_at: string | null
          custom_sid: string | null
          direct_source: string | null
          id: number
          name: string | null
          num: string | null
          rating: string | null
          raw: Json | null
          stream_icon: string | null
          upstream_id: string
        }
        Insert: {
          added?: string | null
          category_id?: string | null
          container_extension?: string | null
          created_at?: string | null
          custom_sid?: string | null
          direct_source?: string | null
          id?: number
          name?: string | null
          num?: string | null
          rating?: string | null
          raw?: Json | null
          stream_icon?: string | null
          upstream_id: string
        }
        Update: {
          added?: string | null
          category_id?: string | null
          container_extension?: string | null
          created_at?: string | null
          custom_sid?: string | null
          direct_source?: string | null
          id?: number
          name?: string | null
          num?: string | null
          rating?: string | null
          raw?: Json | null
          stream_icon?: string | null
          upstream_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
