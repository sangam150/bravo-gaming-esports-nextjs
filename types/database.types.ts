export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
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
        Relationships: [];
      };
      days: {
        Row: {
          created_at: string;
          date: string;
          day_number: number;
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
          id?: string;
          name?: string;
          season_id?: string;
          status?: Database["public"]["Enums"]["day_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      event_teams: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          slot_number: number | null;
          status: string;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          slot_number?: number | null;
          status?: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          slot_number?: number | null;
          status?: string;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          banner_url: string | null;
          competition_status: string;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          discord_url: string | null;
          end_date: string | null;
          event_type: string;
          game: string;
          id: string;
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
          rules: string | null;
          schedule: string | null;
          season_day_number: number | null;
          season_id: string | null;
          server: string | null;
          slug: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["event_status"];
          stream_url: string | null;
          team_count: number;
          tier: string | null;
          title: string;
          type: string | null;
          updated_at: string;
          source_url: string | null;
        };
        Insert: {
          banner_url?: string | null;
          competition_status?: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          discord_url?: string | null;
          end_date?: string | null;
          event_type?: string;
          game?: string;
          id?: string;
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
          rules?: string | null;
          schedule?: string | null;
          season_day_number?: number | null;
          season_id?: string | null;
          server?: string | null;
          slug?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          stream_url?: string | null;
          team_count?: number;
          tier?: string | null;
          title: string;
          type?: string | null;
          updated_at?: string;
          source_url?: string | null;
        };
        Update: {
          banner_url?: string | null;
          competition_status?: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          discord_url?: string | null;
          end_date?: string | null;
          event_type?: string;
          game?: string;
          id?: string;
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
          rules?: string | null;
          schedule?: string | null;
          season_day_number?: number | null;
          season_id?: string | null;
          server?: string | null;
          slug?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          stream_url?: string | null;
          team_count?: number;
          tier?: string | null;
          title?: string;
          type?: string | null;
          updated_at?: string;
          source_url?: string | null;
        };
        Relationships: [];
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
          id: string;
          kills: number;
          knocks: number;
          match_id: string;
          player_name: string | null;
          placement: number;
          placement_points: number;
          player_id: string | null;
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
          id?: string;
          kills?: number;
          knocks?: number;
          match_id: string;
          player_name?: string | null;
          placement?: number;
          placement_points?: number;
          player_id?: string | null;
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
          id?: string;
          kills?: number;
          knocks?: number;
          match_id?: string;
          player_name?: string | null;
          placement?: number;
          placement_points?: number;
          player_id?: string | null;
          pubg_account_id?: string | null;
          slot_number?: number | null;
          survival_time?: number;
          team_id?: string | null;
          team_name?: string | null;
          total_points?: number;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      match_team_results: {
        Row: {
          created_at: string;
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
        Relationships: [];
      };
      matches: {
        Row: {
          created_at: string;
          data_source: string;
          day_id: string | null;
          deleted_at: string | null;
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
        Relationships: [];
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
        Relationships: [];
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
          normalized_json: Json | null;
          normalized_at: string | null;
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
          normalized_json?: Json | null;
          normalized_at?: string | null;
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
          normalized_json?: Json | null;
          normalized_at?: string | null;
          published_at?: string | null;
          raw_json?: Json | null;
          raw_json_id?: string | null;
          retry_count?: number;
          season_id?: string | null;
          source?: string | null;
          status?: Database["public"]["Enums"]["import_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          current_team_id: string | null;
          deleted_at: string | null;
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
          display_name?: string | null;
          id?: string;
          is_active?: boolean;
          photo_url?: string | null;
          pubg_account_id?: string | null;
          pubg_name?: string;
          slug?: string | null;
          updated_at?: string;
        };
        Relationships: [];
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
          rules_json: Json | null;
          slug: string;
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
          rules_json?: Json | null;
          slug: string;
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
          rules_json?: Json | null;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          auth_user_id: string;
          created_at: string;
          display_name: string | null;
          discord_user_id: string | null;
          email: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          team_id: string | null;
          updated_at: string;
        };
        Insert: {
          auth_user_id: string;
          created_at?: string;
          display_name?: string | null;
          discord_user_id?: string | null;
          email: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          team_id?: string | null;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string;
          created_at?: string;
          display_name?: string | null;
          discord_user_id?: string | null;
          email?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          team_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
      };
      seasons: {
        Row: {
          archived_at: string | null;
          completed_at: string | null;
          configured_days: number;
          created_at: string;
          current_event_id: string | null;
          current_day_number: number;
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
          current_event_id?: string | null;
          current_day_number?: number;
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
          current_event_id?: string | null;
          current_day_number?: number;
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
        Relationships: [];
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
      team_roster_history: {
        Row: {
          created_at: string;
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
          end_date?: string | null;
          id?: string;
          player_id?: string;
          start_date?: string;
          status?: string;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          logo_url: string | null;
          name: string;
          region: string | null;
          short_name: string | null;
          slug: string | null;
          slot_number: number | null;
          status: string;
          tag: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          name: string;
          region?: string | null;
          short_name?: string | null;
          slug?: string | null;
          slot_number?: number | null;
          status?: string;
          tag?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          name?: string;
          region?: string | null;
          short_name?: string | null;
          slug?: string | null;
          slot_number?: number | null;
          status?: string;
          tag?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      uploads: {
        Row: {
          content_type: string | null;
          created_at: string;
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      standings: {
        Row: Database["public"]["Views"]["team_leaderboard"]["Row"];
        Relationships: [];
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
        Relationships: [];
      };
      top_fraggers: {
        Row: Database["public"]["Views"]["player_leaderboard"]["Row"];
        Relationships: [];
      };
    };
    Functions: {
      create_next_day: {
        Args: {
          target_season_id?: string | null;
        };
        Returns: string;
      };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      current_user_team_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      ensure_active_scrim_season: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_admin_role: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
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
        | "super_admin"
        | "admin"
        | "moderator"
        | "organizer"
        | "coach"
        | "team_manager"
        | "team_igl"
        | "player"
        | "caster"
        | "viewer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<TableName extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][TableName]["Row"];
export type TablesInsert<TableName extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][TableName]["Insert"];
export type TablesUpdate<TableName extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][TableName]["Update"];
export type Views<ViewName extends keyof PublicSchema["Views"]> = PublicSchema["Views"][ViewName]["Row"];
export type Enums<EnumName extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][EnumName];
