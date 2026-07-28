export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          status: Database["public"]["Enums"]["publish_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          status?: Database["public"]["Enums"]["publish_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          status?: Database["public"]["Enums"]["publish_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_documents: {
        Row: {
          collection_name: string;
          created_at: string;
          data: Json;
          id: string;
          updated_at: string;
        };
        Insert: {
          collection_name: string;
          created_at?: string;
          data?: Json;
          id: string;
          updated_at?: string;
        };
        Update: {
          collection_name?: string;
          created_at?: string;
          data?: Json;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_rate_limits: {
        Row: {
          limiter_key: string;
          request_count: number;
          reset_at: string;
          updated_at: string;
          window_started_at: string;
        };
        Insert: {
          limiter_key: string;
          request_count?: number;
          reset_at?: string;
          updated_at?: string;
          window_started_at?: string;
        };
        Update: {
          limiter_key?: string;
          request_count?: number;
          reset_at?: string;
          updated_at?: string;
          window_started_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          new_data: Json | null;
          old_data: Json | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      days: {
        Row: {
          created_at: string;
          date: string;
          day_number: number;
          demo_seed_tag: string | null;
          id: string;
          name: string;
          season_id: string;
          status: Database["public"]["Enums"]["day_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          day_number: number;
          demo_seed_tag?: string | null;
          id?: string;
          name: string;
          season_id: string;
          status?: Database["public"]["Enums"]["day_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          day_number?: number;
          demo_seed_tag?: string | null;
          id?: string;
          name?: string;
          season_id?: string;
          status?: Database["public"]["Enums"]["day_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "days_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      discord_access_reviews: {
        Row: {
          candidate_team_ids: string[];
          category: string;
          created_at: string;
          details: Json;
          discord_guild_id: string;
          discord_role_ids: string[];
          discord_user_id: string;
          id: string;
          profile_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          candidate_team_ids?: string[];
          category: string;
          created_at?: string;
          details?: Json;
          discord_guild_id: string;
          discord_role_ids?: string[];
          discord_user_id: string;
          id?: string;
          profile_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          candidate_team_ids?: string[];
          category?: string;
          created_at?: string;
          details?: Json;
          discord_guild_id?: string;
          discord_role_ids?: string[];
          discord_user_id?: string;
          id?: string;
          profile_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discord_access_reviews_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discord_access_reviews_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      discord_role_mappings: {
        Row: {
          application_role: string | null;
          created_at: string;
          deny_access: boolean;
          discord_guild_id: string;
          discord_role_id: string;
          discord_role_name: string;
          enabled: boolean;
          id: string;
          last_verified_at: string | null;
          managed_by_discord: boolean;
          mapping_status: string;
          mapping_type: string;
          member_count: number | null;
          priority: number;
          role_color: number;
          role_missing_at: string | null;
          role_position: number;
          team_id: string | null;
          updated_at: string;
        };
        Insert: {
          application_role?: string | null;
          created_at?: string;
          deny_access?: boolean;
          discord_guild_id: string;
          discord_role_id: string;
          discord_role_name: string;
          enabled?: boolean;
          id?: string;
          last_verified_at?: string | null;
          managed_by_discord?: boolean;
          mapping_status?: string;
          mapping_type?: string;
          member_count?: number | null;
          priority?: number;
          role_color?: number;
          role_missing_at?: string | null;
          role_position?: number;
          team_id?: string | null;
          updated_at?: string;
        };
        Update: {
          application_role?: string | null;
          created_at?: string;
          deny_access?: boolean;
          discord_guild_id?: string;
          discord_role_id?: string;
          discord_role_name?: string;
          enabled?: boolean;
          id?: string;
          last_verified_at?: string | null;
          managed_by_discord?: boolean;
          mapping_status?: string;
          mapping_type?: string;
          member_count?: number | null;
          priority?: number;
          role_color?: number;
          role_missing_at?: string | null;
          role_position?: number;
          team_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discord_role_mappings_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      event_teams: {
        Row: {
          created_at: string;
          demo_seed_tag: string | null;
          event_id: string;
          id: string;
          slot_number: number | null;
          status: string;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          demo_seed_tag?: string | null;
          event_id: string;
          id?: string;
          slot_number?: number | null;
          status?: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          demo_seed_tag?: string | null;
          event_id?: string;
          id?: string;
          slot_number?: number | null;
          status?: string;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_teams_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_teams_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          banner_url: string | null;
          competition_status: string;
          created_at: string;
          deleted_at: string | null;
          demo_seed_tag: string | null;
          description: string | null;
          discord_url: string | null;
          end_date: string | null;
          event_type: string;
          game: string;
          id: string;
          lifecycle_status: string;
          map_rotation: Json;
          match_count: number;
          max_teams: number;
          mode: string | null;
          name: string | null;
          perspective: string | null;
          point_system_id: string | null;
          prize_pool: string | null;
          published: boolean;
          published_at: string | null;
          region: string | null;
          registration_end: string | null;
          registration_override: boolean | null;
          registration_start: string | null;
          registration_status: string;
          result_status: string;
          rules: string | null;
          schedule: string | null;
          season_day_number: number | null;
          season_id: string | null;
          server: string | null;
          slug: string | null;
          source_url: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["event_status"];
          stream_status: string;
          stream_url: string | null;
          team_count: number;
          tier: string | null;
          title: string;
          type: string | null;
          updated_at: string;
        };
        Insert: {
          banner_url?: string | null;
          competition_status?: string;
          created_at?: string;
          deleted_at?: string | null;
          demo_seed_tag?: string | null;
          description?: string | null;
          discord_url?: string | null;
          end_date?: string | null;
          event_type?: string;
          game?: string;
          id?: string;
          lifecycle_status?: string;
          map_rotation?: Json;
          match_count?: number;
          max_teams?: number;
          mode?: string | null;
          name?: string | null;
          perspective?: string | null;
          point_system_id?: string | null;
          prize_pool?: string | null;
          published?: boolean;
          published_at?: string | null;
          region?: string | null;
          registration_end?: string | null;
          registration_override?: boolean | null;
          registration_start?: string | null;
          registration_status?: string;
          result_status?: string;
          rules?: string | null;
          schedule?: string | null;
          season_day_number?: number | null;
          season_id?: string | null;
          server?: string | null;
          slug?: string | null;
          source_url?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          stream_status?: string;
          stream_url?: string | null;
          team_count?: number;
          tier?: string | null;
          title: string;
          type?: string | null;
          updated_at?: string;
        };
        Update: {
          banner_url?: string | null;
          competition_status?: string;
          created_at?: string;
          deleted_at?: string | null;
          demo_seed_tag?: string | null;
          description?: string | null;
          discord_url?: string | null;
          end_date?: string | null;
          event_type?: string;
          game?: string;
          id?: string;
          lifecycle_status?: string;
          map_rotation?: Json;
          match_count?: number;
          max_teams?: number;
          mode?: string | null;
          name?: string | null;
          perspective?: string | null;
          point_system_id?: string | null;
          prize_pool?: string | null;
          published?: boolean;
          published_at?: string | null;
          region?: string | null;
          registration_end?: string | null;
          registration_override?: boolean | null;
          registration_start?: string | null;
          registration_status?: string;
          result_status?: string;
          rules?: string | null;
          schedule?: string | null;
          season_day_number?: number | null;
          season_id?: string | null;
          server?: string | null;
          slug?: string | null;
          source_url?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          stream_status?: string;
          stream_url?: string | null;
          team_count?: number;
          tier?: string | null;
          title?: string;
          type?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_point_system_id_fkey";
            columns: ["point_system_id"];
            isOneToOne: false;
            referencedRelation: "point_systems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      import_logs: {
        Row: {
          created_at: string;
          id: string;
          match_id: string | null;
          message: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          match_id?: string | null;
          message: string;
          status: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          match_id?: string | null;
          message?: string;
          status?: string;
        };
        Relationships: [];
      };
      match_player_results: {
        Row: {
          assists: number;
          created_at: string;
          damage: number;
          demo_seed_tag: string | null;
          id: string;
          kills: number;
          link_eligibility: string;
          knocks: number;
          match_id: string;
          placement: number;
          placement_points: number;
          player_id: string | null;
          player_name: string | null;
          pubg_account_id: string | null;
          slot_number: number | null;
          survival_time: number;
          team_id: string | null;
          team_name: string | null;
          total_points: number;
          updated_at: string;
        };
        Insert: {
          assists?: number;
          created_at?: string;
          damage?: number;
          demo_seed_tag?: string | null;
          id?: string;
          kills?: number;
          link_eligibility?: string;
          knocks?: number;
          match_id: string;
          placement?: number;
          placement_points?: number;
          player_id?: string | null;
          player_name?: string | null;
          pubg_account_id?: string | null;
          slot_number?: number | null;
          survival_time?: number;
          team_id?: string | null;
          team_name?: string | null;
          total_points?: number;
          updated_at?: string;
        };
        Update: {
          assists?: number;
          created_at?: string;
          damage?: number;
          demo_seed_tag?: string | null;
          id?: string;
          kills?: number;
          link_eligibility?: string;
          knocks?: number;
          match_id?: string;
          placement?: number;
          placement_points?: number;
          player_id?: string | null;
          player_name?: string | null;
          pubg_account_id?: string | null;
          slot_number?: number | null;
          survival_time?: number;
          team_id?: string | null;
          team_name?: string | null;
          total_points?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_player_results_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_player_results_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_player_results_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      match_players: {
        Row: {
          assists: number;
          created_at: string;
          damage: number;
          day_id: string;
          id: string;
          kills: number;
          match_id: string;
          placement: number;
          player_id: string | null;
          player_name: string;
          pubg_account_id: string | null;
          season_id: string;
          slot_number: number | null;
          survival_time: number;
          team_id: string | null;
        };
        Insert: {
          assists?: number;
          created_at?: string;
          damage?: number;
          day_id: string;
          id?: string;
          kills?: number;
          match_id: string;
          placement?: number;
          player_id?: string | null;
          player_name: string;
          pubg_account_id?: string | null;
          season_id: string;
          slot_number?: number | null;
          survival_time?: number;
          team_id?: string | null;
        };
        Update: {
          assists?: number;
          created_at?: string;
          damage?: number;
          day_id?: string;
          id?: string;
          kills?: number;
          match_id?: string;
          placement?: number;
          player_id?: string | null;
          player_name?: string;
          pubg_account_id?: string | null;
          season_id?: string;
          slot_number?: number | null;
          survival_time?: number;
          team_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_players_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_players_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "season_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_players_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_players_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_players_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      match_results: {
        Row: {
          chicken_dinner: boolean;
          created_at: string;
          day_id: string;
          id: string;
          kills: number;
          match_id: string;
          placement: number;
          placement_points: number;
          season_id: string;
          slot_number: number | null;
          team_id: string | null;
          total_points: number;
        };
        Insert: {
          chicken_dinner?: boolean;
          created_at?: string;
          day_id: string;
          id?: string;
          kills?: number;
          match_id: string;
          placement?: number;
          placement_points?: number;
          season_id: string;
          slot_number?: number | null;
          team_id?: string | null;
          total_points?: number;
        };
        Update: {
          chicken_dinner?: boolean;
          created_at?: string;
          day_id?: string;
          id?: string;
          kills?: number;
          match_id?: string;
          placement?: number;
          placement_points?: number;
          season_id?: string;
          slot_number?: number | null;
          team_id?: string | null;
          total_points?: number;
        };
        Relationships: [
          {
            foreignKeyName: "match_results_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "season_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      match_team_results: {
        Row: {
          created_at: string;
          demo_seed_tag: string | null;
          id: string;
          kill_points: number;
          kills: number;
          match_id: string;
          placement: number;
          placement_points: number;
          slot_number: number | null;
          team_id: string | null;
          team_name: string | null;
          total_points: number;
          updated_at: string;
          wwcd: boolean;
        };
        Insert: {
          created_at?: string;
          demo_seed_tag?: string | null;
          id?: string;
          kill_points?: number;
          kills?: number;
          match_id: string;
          placement?: number;
          placement_points?: number;
          slot_number?: number | null;
          team_id?: string | null;
          team_name?: string | null;
          total_points?: number;
          updated_at?: string;
          wwcd?: boolean;
        };
        Update: {
          created_at?: string;
          demo_seed_tag?: string | null;
          id?: string;
          kill_points?: number;
          kills?: number;
          match_id?: string;
          placement?: number;
          placement_points?: number;
          slot_number?: number | null;
          team_id?: string | null;
          team_name?: string | null;
          total_points?: number;
          updated_at?: string;
          wwcd?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "match_team_results_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_team_results_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          created_at: string;
          data_source: string;
          day_id: string | null;
          deleted_at: string | null;
          demo_seed_tag: string | null;
          event_id: string | null;
          external_match_id: string | null;
          id: string;
          map: string;
          map_name: string | null;
          match_date: string;
          match_id: string;
          match_number: number;
          point_system_id: string | null;
          published_at: string | null;
          raw_json: Json | null;
          result_image_url: string | null;
          scoreboard_image_url: string | null;
          screenshot_urls: Json | null;
          season_id: string;
          source_url: string | null;
          start_time: string | null;
          status: Database["public"]["Enums"]["match_status"];
          updated_at: string;
          vod_url: string | null;
        };
        Insert: {
          created_at?: string;
          data_source?: string;
          day_id?: string | null;
          deleted_at?: string | null;
          demo_seed_tag?: string | null;
          event_id?: string | null;
          external_match_id?: string | null;
          id?: string;
          map: string;
          map_name?: string | null;
          match_date: string;
          match_id: string;
          match_number: number;
          point_system_id?: string | null;
          published_at?: string | null;
          raw_json?: Json | null;
          result_image_url?: string | null;
          scoreboard_image_url?: string | null;
          screenshot_urls?: Json | null;
          season_id: string;
          source_url?: string | null;
          start_time?: string | null;
          status?: Database["public"]["Enums"]["match_status"];
          updated_at?: string;
          vod_url?: string | null;
        };
        Update: {
          created_at?: string;
          data_source?: string;
          day_id?: string | null;
          deleted_at?: string | null;
          demo_seed_tag?: string | null;
          event_id?: string | null;
          external_match_id?: string | null;
          id?: string;
          map?: string;
          map_name?: string | null;
          match_date?: string;
          match_id?: string;
          match_number?: number;
          point_system_id?: string | null;
          published_at?: string | null;
          raw_json?: Json | null;
          result_image_url?: string | null;
          scoreboard_image_url?: string | null;
          screenshot_urls?: Json | null;
          season_id?: string;
          source_url?: string | null;
          start_time?: string | null;
          status?: Database["public"]["Enums"]["match_status"];
          updated_at?: string;
          vod_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "matches_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "season_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_point_system_id_fkey";
            columns: ["point_system_id"];
            isOneToOne: false;
            referencedRelation: "point_systems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      moss_submissions: {
        Row: {
          admin_note: string | null;
          created_at: string;
          event_id: string | null;
          external_link: string | null;
          file_url: string | null;
          id: string;
          match_id: string | null;
          player_id: string | null;
          status: string;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          admin_note?: string | null;
          created_at?: string;
          event_id?: string | null;
          external_link?: string | null;
          file_url?: string | null;
          id?: string;
          match_id?: string | null;
          player_id?: string | null;
          status?: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          admin_note?: string | null;
          created_at?: string;
          event_id?: string | null;
          external_link?: string | null;
          file_url?: string | null;
          id?: string;
          match_id?: string | null;
          player_id?: string | null;
          status?: string;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "moss_submissions_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moss_submissions_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moss_submissions_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moss_submissions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      pending_imports: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          created_by: string | null;
          day_id: string | null;
          error_message: string | null;
          external_match_id: string | null;
          id: string;
          map: string | null;
          match_date: string | null;
          match_id: string;
          match_number: number | null;
          normalized_at: string | null;
          normalized_json: Json | null;
          published_at: string | null;
          raw_json: Json | null;
          raw_json_id: string | null;
          retry_count: number;
          season_id: string | null;
          source: string | null;
          status: Database["public"]["Enums"]["import_status"];
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          day_id?: string | null;
          error_message?: string | null;
          external_match_id?: string | null;
          id?: string;
          map?: string | null;
          match_date?: string | null;
          match_id: string;
          match_number?: number | null;
          normalized_at?: string | null;
          normalized_json?: Json | null;
          published_at?: string | null;
          raw_json?: Json | null;
          raw_json_id?: string | null;
          retry_count?: number;
          season_id?: string | null;
          source?: string | null;
          status?: Database["public"]["Enums"]["import_status"];
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          day_id?: string | null;
          error_message?: string | null;
          external_match_id?: string | null;
          id?: string;
          map?: string | null;
          match_date?: string | null;
          match_id?: string;
          match_number?: number | null;
          normalized_at?: string | null;
          normalized_json?: Json | null;
          published_at?: string | null;
          raw_json?: Json | null;
          raw_json_id?: string | null;
          retry_count?: number;
          season_id?: string | null;
          source?: string | null;
          status?: Database["public"]["Enums"]["import_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pending_imports_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pending_imports_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pending_imports_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pending_imports_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "season_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pending_imports_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      players: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          current_team_id: string | null;
          deleted_at: string | null;
          demo_seed_tag: string | null;
          display_name: string | null;
          id: string;
          is_active: boolean;
          photo_url: string | null;
          pubg_account_id: string | null;
          pubg_name: string;
          slug: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          current_team_id?: string | null;
          deleted_at?: string | null;
          demo_seed_tag?: string | null;
          display_name?: string | null;
          id?: string;
          is_active?: boolean;
          photo_url?: string | null;
          pubg_account_id?: string | null;
          pubg_name: string;
          slug?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          current_team_id?: string | null;
          deleted_at?: string | null;
          demo_seed_tag?: string | null;
          display_name?: string | null;
          id?: string;
          is_active?: boolean;
          photo_url?: string | null;
          pubg_account_id?: string | null;
          pubg_name?: string;
          slug?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_current_team_id_fkey";
            columns: ["current_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      point_systems: {
        Row: {
          active: boolean;
          created_at: string;
          deleted_at: string | null;
          game: string;
          id: string;
          kill_points: number;
          name: string;
          placement_points: Json;
          rules_json: Json;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          game: string;
          id?: string;
          kill_points?: number;
          name: string;
          placement_points?: Json;
          rules_json?: Json;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          game?: string;
          id?: string;
          kill_points?: number;
          name?: string;
          placement_points?: Json;
          rules_json?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          auth_user_id: string;
          created_at: string;
          discord_guild_id: string | null;
          discord_mapped_roles: string[];
          discord_role_ids: string[];
          discord_role_synced_at: string | null;
          discord_team_role_id: string | null;
          discord_team_verified_at: string | null;
          discord_user_id: string | null;
          display_name: string | null;
          email: string;
          id: string;
          is_active: boolean;
          player_id: string | null;
          role: Database["public"]["Enums"]["user_role"];
          role_source: string;
          team_id: string | null;
          updated_at: string;
        };
        Insert: {
          auth_user_id: string;
          created_at?: string;
          discord_guild_id?: string | null;
          discord_mapped_roles?: string[];
          discord_role_ids?: string[];
          discord_role_synced_at?: string | null;
          discord_team_role_id?: string | null;
          discord_team_verified_at?: string | null;
          discord_user_id?: string | null;
          display_name?: string | null;
          email: string;
          id?: string;
          is_active?: boolean;
          player_id?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          role_source?: string;
          team_id?: string | null;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string;
          created_at?: string;
          discord_guild_id?: string | null;
          discord_mapped_roles?: string[];
          discord_role_ids?: string[];
          discord_role_synced_at?: string | null;
          discord_team_role_id?: string | null;
          discord_team_verified_at?: string | null;
          discord_user_id?: string | null;
          display_name?: string | null;
          email?: string;
          id?: string;
          is_active?: boolean;
          player_id?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          role_source?: string;
          team_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      registrations: {
        Row: {
          contact_discord: string;
          contact_email: string | null;
          contact_name: string;
          created_at: string;
          deleted_at: string | null;
          duplicate_candidates: Json;
          event_id: string | null;
          id: string;
          logo_upload_id: string | null;
          official_team_id: string | null;
          onboarding_status: string;
          player_igns: Json;
          reference_code: string;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          submitted_by: string | null;
          team_id: string | null;
          team_name: string;
          team_tag: string | null;
          updated_at: string;
        };
        Insert: {
          contact_discord: string;
          contact_email?: string | null;
          contact_name: string;
          created_at?: string;
          deleted_at?: string | null;
          duplicate_candidates?: Json;
          event_id?: string | null;
          id?: string;
          logo_upload_id?: string | null;
          official_team_id?: string | null;
          onboarding_status?: string;
          player_igns?: Json;
          reference_code: string;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitted_by?: string | null;
          team_id?: string | null;
          team_name: string;
          team_tag?: string | null;
          updated_at?: string;
        };
        Update: {
          contact_discord?: string;
          contact_email?: string | null;
          contact_name?: string;
          created_at?: string;
          deleted_at?: string | null;
          duplicate_candidates?: Json;
          event_id?: string | null;
          id?: string;
          logo_upload_id?: string | null;
          official_team_id?: string | null;
          onboarding_status?: string;
          player_igns?: Json;
          reference_code?: string;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitted_by?: string | null;
          team_id?: string | null;
          team_name?: string;
          team_tag?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registrations_logo_upload_id_fkey";
            columns: ["logo_upload_id"];
            isOneToOne: false;
            referencedRelation: "uploads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registrations_official_team_id_fkey";
            columns: ["official_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registrations_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registrations_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registrations_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      roster_requests: {
        Row: {
          admin_note: string | null;
          created_at: string;
          id: string;
          new_player_name: string | null;
          new_player_pubg_name: string | null;
          old_player_id: string | null;
          payload: Json;
          request_type: string;
          requested_by: string;
          reviewed_at: string | null;
          status: Database["public"]["Enums"]["request_status"];
          team_id: string;
          updated_at: string;
        };
        Insert: {
          admin_note?: string | null;
          created_at?: string;
          id?: string;
          new_player_name?: string | null;
          new_player_pubg_name?: string | null;
          old_player_id?: string | null;
          payload?: Json;
          request_type: string;
          requested_by: string;
          reviewed_at?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          team_id: string;
          updated_at?: string;
        };
        Update: {
          admin_note?: string | null;
          created_at?: string;
          id?: string;
          new_player_name?: string | null;
          new_player_pubg_name?: string | null;
          old_player_id?: string | null;
          payload?: Json;
          request_type?: string;
          requested_by?: string;
          reviewed_at?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roster_requests_old_player_id_fkey";
            columns: ["old_player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roster_requests_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roster_requests_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roster_requests_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      seasons: {
        Row: {
          archived_at: string | null;
          completed_at: string | null;
          configured_days: number;
          created_at: string;
          current_day_number: number;
          current_event_id: string | null;
          demo_seed_tag: string | null;
          description: string | null;
          end_date: string | null;
          ended_early: boolean;
          format: string;
          game: string;
          id: string;
          name: string;
          notes: string | null;
          perspective: string;
          region: string;
          season_number: number;
          series_title: string | null;
          slug: string | null;
          start_date: string;
          status: Database["public"]["Enums"]["season_status"];
          type: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          completed_at?: string | null;
          configured_days?: number;
          created_at?: string;
          current_day_number?: number;
          current_event_id?: string | null;
          demo_seed_tag?: string | null;
          description?: string | null;
          end_date?: string | null;
          ended_early?: boolean;
          format?: string;
          game?: string;
          id?: string;
          name: string;
          notes?: string | null;
          perspective?: string;
          region?: string;
          season_number?: number;
          series_title?: string | null;
          slug?: string | null;
          start_date: string;
          status?: Database["public"]["Enums"]["season_status"];
          type?: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          completed_at?: string | null;
          configured_days?: number;
          created_at?: string;
          current_day_number?: number;
          current_event_id?: string | null;
          demo_seed_tag?: string | null;
          description?: string | null;
          end_date?: string | null;
          ended_early?: boolean;
          format?: string;
          game?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          perspective?: string;
          region?: string;
          season_number?: number;
          series_title?: string | null;
          slug?: string | null;
          start_date?: string;
          status?: Database["public"]["Enums"]["season_status"];
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seasons_current_event_id_fkey";
            columns: ["current_event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          id: string;
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          id?: string;
          key: string;
          updated_at?: string;
          value?: Json;
        };
        Update: {
          id?: string;
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      sponsors: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          featured: boolean | null;
          id: string;
          logo_url: string | null;
          name: string;
          partnership_history: string[] | null;
          published: boolean | null;
          slug: string | null;
          status: Database["public"]["Enums"]["publish_status"];
          supported_events: string[] | null;
          tier: string | null;
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          featured?: boolean | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          partnership_history?: string[] | null;
          published?: boolean | null;
          slug?: string | null;
          status?: Database["public"]["Enums"]["publish_status"];
          supported_events?: string[] | null;
          tier?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          featured?: boolean | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          partnership_history?: string[] | null;
          published?: boolean | null;
          slug?: string | null;
          status?: Database["public"]["Enums"]["publish_status"];
          supported_events?: string[] | null;
          tier?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      team_aliases: {
        Row: {
          alias: string | null;
          created_at: string;
          id: string;
          is_primary: boolean;
          normalized_alias: string | null;
          previous_name: string | null;
          previous_slug: string | null;
          previous_tag: string | null;
          source: string;
          source_identifier: string | null;
          team_id: string;
        };
        Insert: {
          alias?: string | null;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          normalized_alias?: string | null;
          previous_name?: string | null;
          previous_slug?: string | null;
          previous_tag?: string | null;
          source?: string;
          source_identifier?: string | null;
          team_id: string;
        };
        Update: {
          alias?: string | null;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          normalized_alias?: string | null;
          previous_name?: string | null;
          previous_slug?: string | null;
          previous_tag?: string | null;
          source?: string;
          source_identifier?: string | null;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_aliases_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_memberships: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          change_reason: string | null;
          created_at: string;
          discord_role_id: string | null;
          effective_from: string | null;
          effective_until: string | null;
          id: string;
          is_primary: boolean;
          membership_role: string;
          membership_status: string;
          profile_id: string;
          source: string;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          change_reason?: string | null;
          created_at?: string;
          discord_role_id?: string | null;
          effective_from?: string | null;
          effective_until?: string | null;
          id?: string;
          is_primary?: boolean;
          membership_role: string;
          membership_status?: string;
          profile_id: string;
          source?: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          change_reason?: string | null;
          created_at?: string;
          discord_role_id?: string | null;
          effective_from?: string | null;
          effective_until?: string | null;
          id?: string;
          is_primary?: boolean;
          membership_role?: string;
          membership_status?: string;
          profile_id?: string;
          source?: string;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_memberships_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_memberships_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_memberships_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_memberships_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_reconciliation_candidates: {
        Row: {
          aliases: Json;
          confidence: number | null;
          conflict_warnings: Json;
          created_at: string;
          displayed_name: string;
          evidence: Json;
          id: string;
          owner_note: string | null;
          proposed_action: string;
          proposed_team_id: string | null;
          review_status: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          slug: string | null;
          source_identifier: string;
          source_type: string;
          team_tag: string | null;
          updated_at: string;
        };
        Insert: {
          aliases?: Json;
          confidence?: number | null;
          conflict_warnings?: Json;
          created_at?: string;
          displayed_name: string;
          evidence?: Json;
          id?: string;
          owner_note?: string | null;
          proposed_action?: string;
          proposed_team_id?: string | null;
          review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug?: string | null;
          source_identifier: string;
          source_type: string;
          team_tag?: string | null;
          updated_at?: string;
        };
        Update: {
          aliases?: Json;
          confidence?: number | null;
          conflict_warnings?: Json;
          created_at?: string;
          displayed_name?: string;
          evidence?: Json;
          id?: string;
          owner_note?: string | null;
          proposed_action?: string;
          proposed_team_id?: string | null;
          review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug?: string | null;
          source_identifier?: string;
          source_type?: string;
          team_tag?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_reconciliation_candidates_proposed_team_id_fkey";
            columns: ["proposed_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_reconciliation_candidates_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_reconciliation_candidates_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      team_registry_audit: {
        Row: {
          action: string;
          actor_profile_id: string | null;
          candidate_id: string | null;
          created_at: string;
          id: string;
          new_value: Json | null;
          previous_value: Json | null;
          team_id: string | null;
        };
        Insert: {
          action: string;
          actor_profile_id?: string | null;
          candidate_id?: string | null;
          created_at?: string;
          id?: string;
          new_value?: Json | null;
          previous_value?: Json | null;
          team_id?: string | null;
        };
        Update: {
          action?: string;
          actor_profile_id?: string | null;
          candidate_id?: string | null;
          created_at?: string;
          id?: string;
          new_value?: Json | null;
          previous_value?: Json | null;
          team_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "team_registry_audit_actor_profile_id_fkey";
            columns: ["actor_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_registry_audit_actor_profile_id_fkey";
            columns: ["actor_profile_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_registry_audit_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "team_reconciliation_candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_registry_audit_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_roster_history: {
        Row: {
          created_at: string;
          demo_seed_tag: string | null;
          end_date: string | null;
          id: string;
          player_id: string;
          start_date: string;
          status: string;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          demo_seed_tag?: string | null;
          end_date?: string | null;
          id?: string;
          player_id: string;
          start_date: string;
          status?: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          demo_seed_tag?: string | null;
          end_date?: string | null;
          id?: string;
          player_id?: string;
          start_date?: string;
          status?: string;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_roster_history_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_roster_history_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_source_links: {
        Row: {
          historical_name: string | null;
          historical_slug: string | null;
          historical_tag: string | null;
          id: string;
          linked_at: string;
          linked_by: string | null;
          metadata: Json;
          source_identifier: string;
          source_type: string;
          team_id: string;
        };
        Insert: {
          historical_name?: string | null;
          historical_slug?: string | null;
          historical_tag?: string | null;
          id?: string;
          linked_at?: string;
          linked_by?: string | null;
          metadata?: Json;
          source_identifier: string;
          source_type: string;
          team_id: string;
        };
        Update: {
          historical_name?: string | null;
          historical_slug?: string | null;
          historical_tag?: string | null;
          id?: string;
          linked_at?: string;
          linked_by?: string | null;
          metadata?: Json;
          source_identifier?: string;
          source_type?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_source_links_linked_by_fkey";
            columns: ["linked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_source_links_linked_by_fkey";
            columns: ["linked_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_source_links_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          archived_at: string | null;
          created_at: string;
          deleted_at: string | null;
          demo_seed_tag: string | null;
          description: string | null;
          discord_mapping_status: string;
          id: string;
          is_active: boolean;
          logo_url: string | null;
          merged_into_team_id: string | null;
          name: string;
          normalized_name: string | null;
          primary_igl_profile_id: string | null;
          region: string | null;
          short_name: string | null;
          slot_number: number | null;
          slug: string | null;
          source_metadata: Json;
          status: string;
          tag: string | null;
          updated_at: string;
          verification_status: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          demo_seed_tag?: string | null;
          description?: string | null;
          discord_mapping_status?: string;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          merged_into_team_id?: string | null;
          name: string;
          normalized_name?: string | null;
          primary_igl_profile_id?: string | null;
          region?: string | null;
          short_name?: string | null;
          slot_number?: number | null;
          slug?: string | null;
          source_metadata?: Json;
          status?: string;
          tag?: string | null;
          updated_at?: string;
          verification_status?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          demo_seed_tag?: string | null;
          description?: string | null;
          discord_mapping_status?: string;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          merged_into_team_id?: string | null;
          name?: string;
          normalized_name?: string | null;
          primary_igl_profile_id?: string | null;
          region?: string | null;
          short_name?: string | null;
          slot_number?: number | null;
          slug?: string | null;
          source_metadata?: Json;
          status?: string;
          tag?: string | null;
          updated_at?: string;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_merged_into_team_id_fkey";
            columns: ["merged_into_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teams_primary_igl_profile_id_fkey";
            columns: ["primary_igl_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teams_primary_igl_profile_id_fkey";
            columns: ["primary_igl_profile_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      uploads: {
        Row: {
          content_type: string | null;
          created_at: string;
          demo_seed_tag: string | null;
          file_name: string | null;
          file_path: string | null;
          file_type: string;
          file_url: string;
          id: string;
          related_id: string | null;
          related_type: string;
          size_bytes: number | null;
          uploaded_by: string | null;
        };
        Insert: {
          content_type?: string | null;
          created_at?: string;
          demo_seed_tag?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_type: string;
          file_url: string;
          id?: string;
          related_id?: string | null;
          related_type: string;
          size_bytes?: number | null;
          uploaded_by?: string | null;
        };
        Update: {
          content_type?: string | null;
          created_at?: string;
          demo_seed_tag?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_type?: string;
          file_url?: string;
          id?: string;
          related_id?: string | null;
          related_type?: string;
          size_bytes?: number | null;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "uploads_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "uploads_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          auth_user_id: string;
          created_at: string;
          email: string;
          id: string;
          name: string;
          role: Database["public"]["Enums"]["user_role"];
          team_id: string | null;
        };
        Insert: {
          auth_user_id: string;
          created_at?: string;
          email: string;
          id?: string;
          name: string;
          role?: Database["public"]["Enums"]["user_role"];
          team_id?: string | null;
        };
        Update: {
          auth_user_id?: string;
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          role?: Database["public"]["Enums"]["user_role"];
          team_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      videos: {
        Row: {
          category: string | null;
          created_at: string;
          deleted_at: string | null;
          duration: string | null;
          featured: boolean | null;
          game_slug: string | null;
          id: string;
          image_url: string | null;
          kind: string | null;
          published: boolean | null;
          published_at: string | null;
          slug: string | null;
          status: Database["public"]["Enums"]["publish_status"];
          summary: string | null;
          thumbnail_url: string | null;
          title: string;
          updated_at: string;
          video_url: string | null;
          youtube_video_id: string | null;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          duration?: string | null;
          featured?: boolean | null;
          game_slug?: string | null;
          id?: string;
          image_url?: string | null;
          kind?: string | null;
          published?: boolean | null;
          published_at?: string | null;
          slug?: string | null;
          status?: Database["public"]["Enums"]["publish_status"];
          summary?: string | null;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string;
          video_url?: string | null;
          youtube_video_id?: string | null;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          duration?: string | null;
          featured?: boolean | null;
          game_slug?: string | null;
          id?: string;
          image_url?: string | null;
          kind?: string | null;
          published?: boolean | null;
          published_at?: string | null;
          slug?: string | null;
          status?: Database["public"]["Enums"]["publish_status"];
          summary?: string | null;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string;
          video_url?: string | null;
          youtube_video_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      alltime_standings: {
        Row: {
          best_placement: number | null;
          kills: number | null;
          latest_match_date: string | null;
          matches_played: number | null;
          placement_points: number | null;
          rank: number | null;
          team_id: string | null;
          team_name: string | null;
          total_points: number | null;
          wwcd: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_team_results_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_messages: {
        Row: {
          created_at: string | null;
          data: Json | null;
          id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          data?: Json | null;
          id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          data?: Json | null;
          id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      homepage_content: {
        Row: {
          created_at: string | null;
          data: Json | null;
          id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          data?: Json | null;
          id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          data?: Json | null;
          id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      media: {
        Row: {
          category: string | null;
          created_at: string | null;
          deleted_at: string | null;
          duration: string | null;
          featured: boolean | null;
          game_slug: string | null;
          id: string | null;
          image_url: string | null;
          kind: string | null;
          published: boolean | null;
          published_at: string | null;
          slug: string | null;
          status: Database["public"]["Enums"]["publish_status"] | null;
          summary: string | null;
          thumbnail_url: string | null;
          title: string | null;
          updated_at: string | null;
          video_url: string | null;
          youtube_video_id: string | null;
        };
        Insert: {
          category?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          duration?: string | null;
          featured?: boolean | null;
          game_slug?: string | null;
          id?: string | null;
          image_url?: string | null;
          kind?: string | null;
          published?: boolean | null;
          published_at?: string | null;
          slug?: string | null;
          status?: Database["public"]["Enums"]["publish_status"] | null;
          summary?: string | null;
          thumbnail_url?: string | null;
          title?: string | null;
          updated_at?: string | null;
          video_url?: string | null;
          youtube_video_id?: string | null;
        };
        Update: {
          category?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          duration?: string | null;
          featured?: boolean | null;
          game_slug?: string | null;
          id?: string | null;
          image_url?: string | null;
          kind?: string | null;
          published?: boolean | null;
          published_at?: string | null;
          slug?: string | null;
          status?: Database["public"]["Enums"]["publish_status"] | null;
          summary?: string | null;
          thumbnail_url?: string | null;
          title?: string | null;
          updated_at?: string | null;
          video_url?: string | null;
          youtube_video_id?: string | null;
        };
        Relationships: [];
      };
      mvp_rankings: {
        Row: {
          matches_played: number | null;
          mvp_awards: number | null;
          player_id: string | null;
          player_name: string | null;
          rank: number | null;
          season_id: string | null;
          team_id: string | null;
          team_name: string | null;
          total_assists: number | null;
          total_damage: number | null;
          total_kills: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_player_results_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_player_results_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      news_articles: {
        Row: {
          created_at: string | null;
          data: Json | null;
          id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          data?: Json | null;
          id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          data?: Json | null;
          id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      player_leaderboard: {
        Row: {
          latest_match_date: string | null;
          matches_played: number | null;
          player_id: string | null;
          player_name: string | null;
          pubg_account_id: string | null;
          rank: number | null;
          season_id: string | null;
          slot_number: number | null;
          team_id: string | null;
          team_name: string | null;
          total_assists: number | null;
          total_damage: number | null;
          total_kills: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_player_results_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_player_results_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      player_season_stats: {
        Row: {
          avg_damage: number | null;
          avg_kills: number | null;
          matches_played: number | null;
          player_id: string | null;
          player_name: string | null;
          rank: number | null;
          season_id: string | null;
          team_id: string | null;
          team_name: string | null;
          total_assists: number | null;
          total_damage: number | null;
          total_kills: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_player_results_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_player_results_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      season_days: {
        Row: {
          created_at: string | null;
          date: string | null;
          day_number: number | null;
          id: string | null;
          name: string | null;
          season_id: string | null;
          status: Database["public"]["Enums"]["day_status"] | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          date?: string | null;
          day_number?: number | null;
          id?: string | null;
          name?: string | null;
          season_id?: string | null;
          status?: Database["public"]["Enums"]["day_status"] | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          date?: string | null;
          day_number?: number | null;
          id?: string | null;
          name?: string | null;
          season_id?: string | null;
          status?: Database["public"]["Enums"]["day_status"] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "days_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      season_standings: {
        Row: {
          best_placement: number | null;
          kills: number | null;
          latest_match_date: string | null;
          matches_played: number | null;
          placement_points: number | null;
          rank: number | null;
          season_id: string | null;
          team_id: string | null;
          team_name: string | null;
          total_points: number | null;
          wwcd: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_team_results_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      site_settings: {
        Row: {
          id: string | null;
          key: string | null;
          updated_at: string | null;
          value: Json | null;
        };
        Insert: {
          id?: string | null;
          key?: string | null;
          updated_at?: string | null;
          value?: Json | null;
        };
        Update: {
          id?: string | null;
          key?: string | null;
          updated_at?: string | null;
          value?: Json | null;
        };
        Relationships: [];
      };
      standings: {
        Row: {
          best_placement: number | null;
          kills: number | null;
          latest_match_date: string | null;
          matches_played: number | null;
          placement_points: number | null;
          rank: number | null;
          season_id: string | null;
          team_id: string | null;
          team_name: string | null;
          total_points: number | null;
          wwcd: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_team_results_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      team_leaderboard: {
        Row: {
          best_placement: number | null;
          chicken_dinners: number | null;
          latest_match_date: string | null;
          matches_played: number | null;
          placement_points: number | null;
          rank: number | null;
          season_id: string | null;
          slot_number: number | null;
          team_id: string | null;
          team_name: string | null;
          total_kills: number | null;
          total_points: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_team_results_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      top_fraggers: {
        Row: {
          latest_match_date: string | null;
          matches_played: number | null;
          player_id: string | null;
          player_name: string | null;
          pubg_account_id: string | null;
          rank: number | null;
          season_id: string | null;
          slot_number: number | null;
          team_id: string | null;
          team_name: string | null;
          total_assists: number | null;
          total_damage: number | null;
          total_kills: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_player_results_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_player_results_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          auth_user_id: string | null;
          created_at: string | null;
          display_name: string | null;
          email: string | null;
          id: string | null;
          role: Database["public"]["Enums"]["user_role"] | null;
          team_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email?: string | null;
          id?: string | null;
          role?: Database["public"]["Enums"]["user_role"] | null;
          team_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email?: string | null;
          id?: string | null;
          role?: Database["public"]["Enums"]["user_role"] | null;
          team_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      consume_rate_limit: {
        Args: { p_key: string; p_max_requests: number; p_window_ms: number };
        Returns: Json;
      };
      create_next_day: { Args: { target_season_id?: string }; Returns: string };
      current_user_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      current_user_team_id: { Args: never; Returns: string };
      ensure_active_scrim_season: { Args: never; Returns: string };
      is_admin_role: { Args: never; Returns: boolean };
      is_public_app_document: {
        Args: { collection_name: string; payload: Json };
        Returns: boolean;
      };
      is_team_role: { Args: never; Returns: boolean };
      jsonb_flag_true_by_default: {
        Args: { key: string; payload: Json };
        Returns: boolean;
      };
      parse_optional_timestamptz: { Args: { value: string }; Returns: string };
      get_player_team_linking_admin_dashboard: {
        Args: never;
        Returns: Json;
      };
      recalculate_player_team_links: {
        Args: { target_pubg_account_id?: string | null };
        Returns: Json;
      };
      reconcile_player_team_link_for_account: {
        Args: { target_pubg_account_id: string };
        Returns: Json;
      };
      reconcile_player_team_links_for_match: {
        Args: { target_match_id: string };
        Returns: Json;
      };
      review_player_team_link: {
        Args: {
          actor_profile_id: string;
          decision: string;
          note?: string | null;
          target_review_id: string;
        };
        Returns: Json;
      };
      unlink_player_team_membership: {
        Args: {
          actor_profile_id: string;
          reason: string;
          target_membership_id: string;
        };
        Returns: Json;
      };
      update_player_team_link_settings: {
        Args: {
          actor_profile_id: string;
          settings: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      day_status: "scheduled" | "active" | "completed" | "waiting_for_data" | "cancelled";
      event_status: "draft" | "active" | "completed" | "archived";
      import_status:
        | "pending"
        | "approved"
        | "published"
        | "rejected"
        | "failed"
        | "queued"
        | "fetching"
        | "fetched"
        | "normalized"
        | "draft"
        | "repaired"
        | "reset";
      match_status: "pending" | "approved" | "published" | "rejected" | "failed";
      publish_status: "draft" | "published" | "archived";
      request_status: "pending" | "approved" | "rejected" | "review_later";
      season_status: "planned" | "active" | "completed" | "archived";
      user_role:
        "super_admin" | "admin" | "moderator" | "team_igl" | "caster" | "viewer" | "organizer" | "team_manager" | "coach" | "player";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      day_status: ["scheduled", "active", "completed", "waiting_for_data", "cancelled"],
      event_status: ["draft", "active", "completed", "archived"],
      import_status: [
        "pending",
        "approved",
        "published",
        "rejected",
        "failed",
        "queued",
        "fetching",
        "fetched",
        "normalized",
        "draft",
        "repaired",
        "reset",
      ],
      match_status: ["pending", "approved", "published", "rejected", "failed"],
      publish_status: ["draft", "published", "archived"],
      request_status: ["pending", "approved", "rejected", "review_later"],
      season_status: ["planned", "active", "completed", "archived"],
      user_role: ["super_admin", "admin", "moderator", "team_igl", "caster", "viewer", "organizer", "team_manager", "coach", "player"],
    },
  },
} as const;
