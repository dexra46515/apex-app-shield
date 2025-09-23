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
      api_schemas: {
        Row: {
          created_at: string
          id: string
          method: string
          name: string
          path_pattern: string
          schema_definition: Json
          strict_mode: boolean | null
          updated_at: string
          validation_enabled: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          method: string
          name: string
          path_pattern: string
          schema_definition: Json
          strict_mode?: boolean | null
          updated_at?: string
          validation_enabled?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          method?: string
          name?: string
          path_pattern?: string
          schema_definition?: Json
          strict_mode?: boolean | null
          updated_at?: string
          validation_enabled?: boolean | null
        }
        Relationships: []
      }
      bot_signatures: {
        Row: {
          bot_type: string
          confidence: number | null
          created_at: string
          enabled: boolean | null
          id: string
          name: string
          pattern: string
          signature_type: string
        }
        Insert: {
          bot_type: string
          confidence?: number | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          name: string
          pattern: string
          signature_type: string
        }
        Update: {
          bot_type?: string
          confidence?: number | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          name?: string
          pattern?: string
          signature_type?: string
        }
        Relationships: []
      }
      ip_reputation: {
        Row: {
          asn: number | null
          country_code: string | null
          created_at: string
          id: string
          ip_address: unknown
          is_proxy: boolean | null
          is_tor: boolean | null
          is_vpn: boolean | null
          last_seen: string | null
          reputation_score: number | null
          risk_level: string | null
          updated_at: string
        }
        Insert: {
          asn?: number | null
          country_code?: string | null
          created_at?: string
          id?: string
          ip_address: unknown
          is_proxy?: boolean | null
          is_tor?: boolean | null
          is_vpn?: boolean | null
          last_seen?: string | null
          reputation_score?: number | null
          risk_level?: string | null
          updated_at?: string
        }
        Update: {
          asn?: number | null
          country_code?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          is_proxy?: boolean | null
          is_tor?: boolean | null
          is_vpn?: boolean | null
          last_seen?: string | null
          reputation_score?: number | null
          risk_level?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_rules: {
        Row: {
          created_at: string
          enabled: boolean | null
          id: string
          limit_type: string
          limit_value: number
          method: string | null
          name: string
          path_pattern: string | null
          source_criteria: string
          window_size: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          limit_type: string
          limit_value: number
          method?: string | null
          name: string
          path_pattern?: string | null
          source_criteria: string
          window_size: number
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          limit_type?: string
          limit_value?: number
          method?: string | null
          name?: string
          path_pattern?: string | null
          source_criteria?: string
          window_size?: number
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          acknowledged: boolean | null
          alert_type: string
          created_at: string
          description: string | null
          event_count: number | null
          first_seen: string
          id: string
          last_seen: string
          resolved: boolean | null
          rule_id: string | null
          severity: string
          source_ip: unknown | null
          title: string
        }
        Insert: {
          acknowledged?: boolean | null
          alert_type: string
          created_at?: string
          description?: string | null
          event_count?: number | null
          first_seen?: string
          id?: string
          last_seen?: string
          resolved?: boolean | null
          rule_id?: string | null
          severity: string
          source_ip?: unknown | null
          title: string
        }
        Update: {
          acknowledged?: boolean | null
          alert_type?: string
          created_at?: string
          description?: string | null
          event_count?: number | null
          first_seen?: string
          id?: string
          last_seen?: string
          resolved?: boolean | null
          rule_id?: string | null
          severity?: string
          source_ip?: unknown | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "security_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          asn: number | null
          blocked: boolean | null
          country_code: string | null
          created_at: string
          destination_ip: unknown | null
          event_type: string
          id: string
          payload: string | null
          request_headers: Json | null
          request_method: string | null
          request_path: string | null
          response_size: number | null
          response_status: number | null
          rule_id: string | null
          severity: string
          source_ip: unknown
          threat_type: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          asn?: number | null
          blocked?: boolean | null
          country_code?: string | null
          created_at?: string
          destination_ip?: unknown | null
          event_type: string
          id?: string
          payload?: string | null
          request_headers?: Json | null
          request_method?: string | null
          request_path?: string | null
          response_size?: number | null
          response_status?: number | null
          rule_id?: string | null
          severity: string
          source_ip: unknown
          threat_type?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          asn?: number | null
          blocked?: boolean | null
          country_code?: string | null
          created_at?: string
          destination_ip?: unknown | null
          event_type?: string
          id?: string
          payload?: string | null
          request_headers?: Json | null
          request_method?: string | null
          request_path?: string | null
          response_size?: number | null
          response_status?: number | null
          rule_id?: string | null
          severity?: string
          source_ip?: unknown
          threat_type?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      security_rules: {
        Row: {
          actions: Json
          category: string
          conditions: Json
          created_at: string
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          priority: number | null
          rule_type: string
          severity: string
          updated_at: string
        }
        Insert: {
          actions: Json
          category: string
          conditions: Json
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          priority?: number | null
          rule_type: string
          severity: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          category?: string
          conditions?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          priority?: number | null
          rule_type?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      threat_intelligence: {
        Row: {
          active: boolean | null
          confidence_score: number | null
          created_at: string
          description: string | null
          domain: string | null
          expires_at: string | null
          hash_value: string | null
          id: string
          ip_address: unknown | null
          source: string
          threat_type: string
        }
        Insert: {
          active?: boolean | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          domain?: string | null
          expires_at?: string | null
          hash_value?: string | null
          id?: string
          ip_address?: unknown | null
          source: string
          threat_type: string
        }
        Update: {
          active?: boolean | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          domain?: string | null
          expires_at?: string | null
          hash_value?: string | null
          id?: string
          ip_address?: unknown | null
          source?: string
          threat_type?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          last_login: string | null
          preferences: Json | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          last_login?: string | null
          preferences?: Json | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          last_login?: string | null
          preferences?: Json | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waf_config: {
        Row: {
          category: string
          config_key: string
          config_value: Json
          description: string | null
          id: string
          updated_at: string
        }
        Insert: {
          category: string
          config_key: string
          config_value: Json
          description?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          category?: string
          config_key?: string
          config_value?: Json
          description?: string | null
          id?: string
          updated_at?: string
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
