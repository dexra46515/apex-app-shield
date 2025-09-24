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
      adaptive_rules: {
        Row: {
          action_parameters: Json | null
          action_type: string
          auto_generated: boolean
          condition_pattern: Json
          created_at: string
          id: string
          is_active: boolean
          last_triggered: string | null
          learning_confidence: number | null
          name: string
          trigger_count: number
        }
        Insert: {
          action_parameters?: Json | null
          action_type: string
          auto_generated?: boolean
          condition_pattern: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered?: string | null
          learning_confidence?: number | null
          name: string
          trigger_count?: number
        }
        Update: {
          action_parameters?: Json | null
          action_type?: string
          auto_generated?: boolean
          condition_pattern?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered?: string | null
          learning_confidence?: number | null
          name?: string
          trigger_count?: number
        }
        Relationships: []
      }
      ai_anomaly_detections: {
        Row: {
          ai_analysis_result: Json
          anomaly_score: number
          behavior_pattern: Json
          created_at: string
          id: string
          mitigation_action: string
          session_id: string
          source_ip: unknown
          threat_level: string
        }
        Insert: {
          ai_analysis_result: Json
          anomaly_score: number
          behavior_pattern: Json
          created_at?: string
          id?: string
          mitigation_action: string
          session_id: string
          source_ip: unknown
          threat_level: string
        }
        Update: {
          ai_analysis_result?: Json
          anomaly_score?: number
          behavior_pattern?: Json
          created_at?: string
          id?: string
          mitigation_action?: string
          session_id?: string
          source_ip?: unknown
          threat_level?: string
        }
        Relationships: []
      }
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
      attack_ttp_patterns: {
        Row: {
          attack_pattern: Json
          attack_timeline: Json
          behavioral_signature: Json
          confidence_score: number
          created_at: string
          data_exfiltration: Json | null
          detected_tools: string[] | null
          honeypot_interaction_id: string | null
          id: string
          lateral_movement: Json | null
          mitre_tactic: string
          mitre_technique: string
          payload_analysis: Json
          persistence_methods: Json | null
          severity_level: string
          technique_id: string
          updated_at: string
        }
        Insert: {
          attack_pattern: Json
          attack_timeline: Json
          behavioral_signature: Json
          confidence_score?: number
          created_at?: string
          data_exfiltration?: Json | null
          detected_tools?: string[] | null
          honeypot_interaction_id?: string | null
          id?: string
          lateral_movement?: Json | null
          mitre_tactic: string
          mitre_technique: string
          payload_analysis: Json
          persistence_methods?: Json | null
          severity_level?: string
          technique_id: string
          updated_at?: string
        }
        Update: {
          attack_pattern?: Json
          attack_timeline?: Json
          behavioral_signature?: Json
          confidence_score?: number
          created_at?: string
          data_exfiltration?: Json | null
          detected_tools?: string[] | null
          honeypot_interaction_id?: string | null
          id?: string
          lateral_movement?: Json | null
          mitre_tactic?: string
          mitre_technique?: string
          payload_analysis?: Json
          persistence_methods?: Json | null
          severity_level?: string
          technique_id?: string
          updated_at?: string
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
      cicd_security_tests: {
        Row: {
          artifacts_url: string | null
          branch_name: string
          commit_hash: string
          completed_at: string | null
          created_at: string
          customer_id: string
          error_message: string | null
          id: string
          pipeline_id: string | null
          repository_url: string
          security_score: number
          status: string
          test_duration_ms: number | null
          test_results: Json
          test_suite_name: string
          vulnerabilities_found: number
        }
        Insert: {
          artifacts_url?: string | null
          branch_name: string
          commit_hash: string
          completed_at?: string | null
          created_at?: string
          customer_id: string
          error_message?: string | null
          id?: string
          pipeline_id?: string | null
          repository_url: string
          security_score?: number
          status?: string
          test_duration_ms?: number | null
          test_results: Json
          test_suite_name: string
          vulnerabilities_found?: number
        }
        Update: {
          artifacts_url?: string | null
          branch_name?: string
          commit_hash?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          error_message?: string | null
          id?: string
          pipeline_id?: string | null
          repository_url?: string
          security_score?: number
          status?: string
          test_duration_ms?: number | null
          test_results?: Json
          test_suite_name?: string
          vulnerabilities_found?: number
        }
        Relationships: []
      }
      cloud_credentials: {
        Row: {
          created_at: string
          credential_name: string
          encrypted_credentials: Json
          id: string
          is_active: boolean
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_name: string
          encrypted_credentials: Json
          id?: string
          is_active?: boolean
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_name?: string
          encrypted_credentials?: Json
          id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      compliance_reports: {
        Row: {
          compliance_score: number
          created_at: string
          findings: Json
          generated_by: string | null
          id: string
          recommendations: Json
          report_data: Json
          report_period_end: string
          report_period_start: string
          report_type: string
        }
        Insert: {
          compliance_score: number
          created_at?: string
          findings: Json
          generated_by?: string | null
          id?: string
          recommendations: Json
          report_data: Json
          report_period_end: string
          report_period_start: string
          report_type: string
        }
        Update: {
          compliance_score?: number
          created_at?: string
          findings?: Json
          generated_by?: string | null
          id?: string
          recommendations?: Json
          report_data?: Json
          report_period_end?: string
          report_period_start?: string
          report_type?: string
        }
        Relationships: []
      }
      custom_security_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          last_matched: string | null
          match_count: number
          name: string
          priority: number
          rule_category: string
          updated_at: string
        }
        Insert: {
          actions: Json
          conditions: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_matched?: string | null
          match_count?: number
          name: string
          priority?: number
          rule_category: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_matched?: string | null
          match_count?: number
          name?: string
          priority?: number
          rule_category?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_deployments: {
        Row: {
          api_key: string
          config_settings: Json | null
          created_at: string
          customer_email: string | null
          customer_name: string
          deployment_type: string
          domain: string
          id: string
          last_seen: string | null
          requests_today: number | null
          requests_total: number | null
          status: string
          threats_blocked_today: number | null
          threats_blocked_total: number | null
          updated_at: string
        }
        Insert: {
          api_key?: string
          config_settings?: Json | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          deployment_type: string
          domain: string
          id?: string
          last_seen?: string | null
          requests_today?: number | null
          requests_total?: number | null
          status?: string
          threats_blocked_today?: number | null
          threats_blocked_total?: number | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          config_settings?: Json | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          deployment_type?: string
          domain?: string
          id?: string
          last_seen?: string | null
          requests_today?: number | null
          requests_total?: number | null
          status?: string
          threats_blocked_today?: number | null
          threats_blocked_total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ddos_predictions: {
        Row: {
          actual_volume: number | null
          confidence_level: number
          early_indicators: Json
          id: string
          is_active: boolean
          mitigation_recommendations: Json
          predicted_at: string
          predicted_attack_type: string
          predicted_volume: number
          prediction_accuracy: number | null
          prediction_window: string
          risk_factors: Json
          source_patterns: Json
          target_time: string
        }
        Insert: {
          actual_volume?: number | null
          confidence_level?: number
          early_indicators: Json
          id?: string
          is_active?: boolean
          mitigation_recommendations: Json
          predicted_at?: string
          predicted_attack_type: string
          predicted_volume: number
          prediction_accuracy?: number | null
          prediction_window: string
          risk_factors: Json
          source_patterns: Json
          target_time: string
        }
        Update: {
          actual_volume?: number | null
          confidence_level?: number
          early_indicators?: Json
          id?: string
          is_active?: boolean
          mitigation_recommendations?: Json
          predicted_at?: string
          predicted_attack_type?: string
          predicted_volume?: number
          prediction_accuracy?: number | null
          prediction_window?: string
          risk_factors?: Json
          source_patterns?: Json
          target_time?: string
        }
        Relationships: []
      }
      debug_events: {
        Row: {
          action_taken: string
          created_at: string
          event_timestamp: string
          id: string
          processing_stack_trace: Json | null
          processing_time_ms: number
          request_body: string | null
          request_headers: Json | null
          request_method: string
          request_path: string
          response_body: string | null
          response_headers: Json | null
          response_status: number | null
          rule_matches: Json | null
          session_id: string
          source_ip: unknown
          threat_analysis: Json | null
        }
        Insert: {
          action_taken: string
          created_at?: string
          event_timestamp?: string
          id?: string
          processing_stack_trace?: Json | null
          processing_time_ms: number
          request_body?: string | null
          request_headers?: Json | null
          request_method: string
          request_path: string
          response_body?: string | null
          response_headers?: Json | null
          response_status?: number | null
          rule_matches?: Json | null
          session_id: string
          source_ip: unknown
          threat_analysis?: Json | null
        }
        Update: {
          action_taken?: string
          created_at?: string
          event_timestamp?: string
          id?: string
          processing_stack_trace?: Json | null
          processing_time_ms?: number
          request_body?: string | null
          request_headers?: Json | null
          request_method?: string
          request_path?: string
          response_body?: string | null
          response_headers?: Json | null
          response_status?: number | null
          rule_matches?: Json | null
          session_id?: string
          source_ip?: unknown
          threat_analysis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "debug_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "debug_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      debug_sessions: {
        Row: {
          capture_settings: Json
          created_at: string
          created_by: string | null
          customer_id: string
          debug_mode: string
          ended_at: string | null
          events_captured: number
          filters: Json
          id: string
          is_active: boolean
          session_duration_minutes: number | null
          session_name: string
          target_domain: string
        }
        Insert: {
          capture_settings?: Json
          created_at?: string
          created_by?: string | null
          customer_id: string
          debug_mode?: string
          ended_at?: string | null
          events_captured?: number
          filters?: Json
          id?: string
          is_active?: boolean
          session_duration_minutes?: number | null
          session_name: string
          target_domain: string
        }
        Update: {
          capture_settings?: Json
          created_at?: string
          created_by?: string | null
          customer_id?: string
          debug_mode?: string
          ended_at?: string | null
          events_captured?: number
          filters?: Json
          id?: string
          is_active?: boolean
          session_duration_minutes?: number | null
          session_name?: string
          target_domain?: string
        }
        Relationships: []
      }
      deployment_artifacts: {
        Row: {
          artifact_type: string
          checksum: string | null
          created_at: string
          deployment_id: string
          file_size: number | null
          id: string
          storage_path: string
        }
        Insert: {
          artifact_type: string
          checksum?: string | null
          created_at?: string
          deployment_id: string
          file_size?: number | null
          id?: string
          storage_path: string
        }
        Update: {
          artifact_type?: string
          checksum?: string | null
          created_at?: string
          deployment_id?: string
          file_size?: number | null
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_artifacts_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "live_deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_waf_configs: {
        Row: {
          config_name: string
          config_template: Json
          created_at: string
          customer_id: string
          docker_config: string | null
          download_count: number
          environment_vars: Json
          framework: string
          id: string
          is_active: boolean
          middleware_code: string
          npm_package_config: Json | null
          updated_at: string
        }
        Insert: {
          config_name: string
          config_template: Json
          created_at?: string
          customer_id: string
          docker_config?: string | null
          download_count?: number
          environment_vars?: Json
          framework: string
          id?: string
          is_active?: boolean
          middleware_code: string
          npm_package_config?: Json | null
          updated_at?: string
        }
        Update: {
          config_name?: string
          config_template?: Json
          created_at?: string
          customer_id?: string
          docker_config?: string | null
          download_count?: number
          environment_vars?: Json
          framework?: string
          id?: string
          is_active?: boolean
          middleware_code?: string
          npm_package_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      device_attestations: {
        Row: {
          attestation_chain_valid: boolean | null
          attestation_token: string
          created_at: string
          device_fingerprint: string
          hardware_verified: boolean | null
          id: string
          last_verified: string
          pcr_values: Json | null
          platform_info: Json
          security_features: Json
          tee_type: string | null
          tpm_version: string | null
          trust_level: string
          verification_status: string
        }
        Insert: {
          attestation_chain_valid?: boolean | null
          attestation_token: string
          created_at?: string
          device_fingerprint: string
          hardware_verified?: boolean | null
          id?: string
          last_verified?: string
          pcr_values?: Json | null
          platform_info: Json
          security_features: Json
          tee_type?: string | null
          tpm_version?: string | null
          trust_level?: string
          verification_status?: string
        }
        Update: {
          attestation_chain_valid?: boolean | null
          attestation_token?: string
          created_at?: string
          device_fingerprint?: string
          hardware_verified?: boolean | null
          id?: string
          last_verified?: string
          pcr_values?: Json | null
          platform_info?: Json
          security_features?: Json
          tee_type?: string | null
          tpm_version?: string | null
          trust_level?: string
          verification_status?: string
        }
        Relationships: []
      }
      dynamic_honeypots: {
        Row: {
          api_schema: Json
          auto_generated: boolean
          created_at: string
          effectiveness_score: number
          endpoint_pattern: string
          honeypot_id: string
          id: string
          interaction_count: number
          interaction_rules: Json
          is_active: boolean
          last_interaction: string | null
          learning_source: string | null
          response_templates: Json
          ttl: string | null
        }
        Insert: {
          api_schema: Json
          auto_generated?: boolean
          created_at?: string
          effectiveness_score?: number
          endpoint_pattern: string
          honeypot_id: string
          id?: string
          interaction_count?: number
          interaction_rules: Json
          is_active?: boolean
          last_interaction?: string | null
          learning_source?: string | null
          response_templates: Json
          ttl?: string | null
        }
        Update: {
          api_schema?: Json
          auto_generated?: boolean
          created_at?: string
          effectiveness_score?: number
          endpoint_pattern?: string
          honeypot_id?: string
          id?: string
          interaction_count?: number
          interaction_rules?: Json
          is_active?: boolean
          last_interaction?: string | null
          learning_source?: string | null
          response_templates?: Json
          ttl?: string | null
        }
        Relationships: []
      }
      encrypted_flow_patterns: {
        Row: {
          anomaly_score: number
          confidence_level: number
          destination_ip: unknown | null
          detected_at: string
          flow_direction: string
          flow_signature: string
          id: string
          metadata: Json
          packet_sizes: Json
          pattern_type: string
          protocol: string
          source_ip: unknown
          timing_patterns: Json
        }
        Insert: {
          anomaly_score?: number
          confidence_level?: number
          destination_ip?: unknown | null
          detected_at?: string
          flow_direction: string
          flow_signature: string
          id?: string
          metadata?: Json
          packet_sizes: Json
          pattern_type: string
          protocol: string
          source_ip: unknown
          timing_patterns: Json
        }
        Update: {
          anomaly_score?: number
          confidence_level?: number
          destination_ip?: unknown | null
          detected_at?: string
          flow_direction?: string
          flow_signature?: string
          id?: string
          metadata?: Json
          packet_sizes?: Json
          pattern_type?: string
          protocol?: string
          source_ip?: unknown
          timing_patterns?: Json
        }
        Relationships: []
      }
      geo_restrictions: {
        Row: {
          asn: number | null
          country_code: string | null
          created_at: string
          id: string
          is_active: boolean
          organization: string | null
          reason: string
          region: string | null
          restriction_type: string
        }
        Insert: {
          asn?: number | null
          country_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          organization?: string | null
          reason: string
          region?: string | null
          restriction_type: string
        }
        Update: {
          asn?: number | null
          country_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          organization?: string | null
          reason?: string
          region?: string | null
          restriction_type?: string
        }
        Relationships: []
      }
      gitops_security_policies: {
        Row: {
          access_token_encrypted: string | null
          auto_deploy: boolean
          branch_name: string
          created_at: string
          customer_id: string
          git_provider: string
          id: string
          last_sync: string | null
          policy_file_path: string
          policy_version: string | null
          repository_url: string
          sync_status: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          auto_deploy?: boolean
          branch_name?: string
          created_at?: string
          customer_id: string
          git_provider?: string
          id?: string
          last_sync?: string | null
          policy_file_path?: string
          policy_version?: string | null
          repository_url: string
          sync_status?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          auto_deploy?: boolean
          branch_name?: string
          created_at?: string
          customer_id?: string
          git_provider?: string
          id?: string
          last_sync?: string | null
          policy_file_path?: string
          policy_version?: string | null
          repository_url?: string
          sync_status?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      hardware_signed_logs: {
        Row: {
          chain_hash: string
          created_at: string
          hardware_signature: string
          id: string
          integrity_verified: boolean
          log_data: Json
          previous_hash: string
          tpm_pcr_values: Json | null
        }
        Insert: {
          chain_hash: string
          created_at?: string
          hardware_signature: string
          id?: string
          integrity_verified?: boolean
          log_data: Json
          previous_hash: string
          tpm_pcr_values?: Json | null
        }
        Update: {
          chain_hash?: string
          created_at?: string
          hardware_signature?: string
          id?: string
          integrity_verified?: boolean
          log_data?: Json
          previous_hash?: string
          tpm_pcr_values?: Json | null
        }
        Relationships: []
      }
      hardware_trust_metrics: {
        Row: {
          attestation_source: string | null
          device_fingerprint: string | null
          id: string
          measurement_time: string
          metadata: Json | null
          metric_name: string
          metric_value: number
          trust_chain_depth: number | null
        }
        Insert: {
          attestation_source?: string | null
          device_fingerprint?: string | null
          id?: string
          measurement_time?: string
          metadata?: Json | null
          metric_name: string
          metric_value: number
          trust_chain_depth?: number | null
        }
        Update: {
          attestation_source?: string | null
          device_fingerprint?: string | null
          id?: string
          measurement_time?: string
          metadata?: Json | null
          metric_name?: string
          metric_value?: number
          trust_chain_depth?: number | null
        }
        Relationships: []
      }
      honeypot_interactions: {
        Row: {
          created_at: string
          honeypot_id: string
          id: string
          request_body: string | null
          request_headers: Json | null
          request_method: string
          source_ip: unknown
          threat_score: number
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          honeypot_id: string
          id?: string
          request_body?: string | null
          request_headers?: Json | null
          request_method: string
          source_ip: unknown
          threat_score?: number
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          honeypot_id?: string
          id?: string
          request_body?: string | null
          request_headers?: Json | null
          request_method?: string
          source_ip?: unknown
          threat_score?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "honeypot_interactions_honeypot_id_fkey"
            columns: ["honeypot_id"]
            isOneToOne: false
            referencedRelation: "honeypots"
            referencedColumns: ["id"]
          },
        ]
      }
      honeypots: {
        Row: {
          created_at: string
          decoy_response: Json
          endpoint_path: string
          id: string
          is_active: boolean
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          decoy_response: Json
          endpoint_path: string
          id?: string
          is_active?: boolean
          name: string
          type: string
        }
        Update: {
          created_at?: string
          decoy_response?: Json
          endpoint_path?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
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
      live_deployments: {
        Row: {
          cloud_provider: string
          cost_estimate: number | null
          created_at: string
          customer_id: string
          deployment_config: Json
          deployment_logs: Json | null
          deployment_model: string
          id: string
          infrastructure_id: string | null
          internal_endpoints: Json | null
          public_url: string | null
          status: string
          terminated_at: string | null
          updated_at: string
        }
        Insert: {
          cloud_provider: string
          cost_estimate?: number | null
          created_at?: string
          customer_id: string
          deployment_config: Json
          deployment_logs?: Json | null
          deployment_model: string
          id?: string
          infrastructure_id?: string | null
          internal_endpoints?: Json | null
          public_url?: string | null
          status?: string
          terminated_at?: string | null
          updated_at?: string
        }
        Update: {
          cloud_provider?: string
          cost_estimate?: number | null
          created_at?: string
          customer_id?: string
          deployment_config?: Json
          deployment_logs?: Json | null
          deployment_model?: string
          id?: string
          infrastructure_id?: string | null
          internal_endpoints?: Json | null
          public_url?: string | null
          status?: string
          terminated_at?: string | null
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
      rule_deployments: {
        Row: {
          auto_promote: boolean
          created_by: string | null
          current_status: string
          deployment_phase: string
          end_time: string | null
          false_positive_rate: number
          id: string
          metadata: Json
          performance_impact: number
          promotion_criteria: Json
          rule_id: string
          start_time: string
          success_rate: number
          traffic_percentage: number
        }
        Insert: {
          auto_promote?: boolean
          created_by?: string | null
          current_status?: string
          deployment_phase?: string
          end_time?: string | null
          false_positive_rate?: number
          id?: string
          metadata?: Json
          performance_impact?: number
          promotion_criteria?: Json
          rule_id: string
          start_time?: string
          success_rate?: number
          traffic_percentage?: number
        }
        Update: {
          auto_promote?: boolean
          created_by?: string | null
          current_status?: string
          deployment_phase?: string
          end_time?: string | null
          false_positive_rate?: number
          id?: string
          metadata?: Json
          performance_impact?: number
          promotion_criteria?: Json
          rule_id?: string
          start_time?: string
          success_rate?: number
          traffic_percentage?: number
        }
        Relationships: []
      }
      schema_violations: {
        Row: {
          api_schema_id: string
          created_at: string
          id: string
          request_data: Json | null
          severity: string
          source_ip: unknown
          violation_details: Json
          violation_type: string
        }
        Insert: {
          api_schema_id: string
          created_at?: string
          id?: string
          request_data?: Json | null
          severity: string
          source_ip: unknown
          violation_details: Json
          violation_type: string
        }
        Update: {
          api_schema_id?: string
          created_at?: string
          id?: string
          request_data?: Json | null
          severity?: string
          source_ip?: unknown
          violation_details?: Json
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "schema_violations_api_schema_id_fkey"
            columns: ["api_schema_id"]
            isOneToOne: false
            referencedRelation: "api_schemas"
            referencedColumns: ["id"]
          },
        ]
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
      siem_events: {
        Row: {
          correlation_id: string | null
          created_at: string
          event_data: Json
          event_source: string
          event_type: string
          export_timestamp: string | null
          exported_to_siem: boolean
          id: string
          severity: string
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string
          event_data: Json
          event_source: string
          event_type: string
          export_timestamp?: string | null
          exported_to_siem?: boolean
          id?: string
          severity: string
        }
        Update: {
          correlation_id?: string | null
          created_at?: string
          event_data?: Json
          event_source?: string
          event_type?: string
          export_timestamp?: string | null
          exported_to_siem?: boolean
          id?: string
          severity?: string
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
      tls_fingerprints: {
        Row: {
          cipher_suites: Json
          extensions: Json
          first_seen: string
          id: string
          is_malicious: boolean
          ja3_hash: string
          ja3_string: string
          last_seen: string
          metadata: Json
          request_count: number
          source_ip: unknown
          threat_score: number
          tls_version: string
        }
        Insert: {
          cipher_suites: Json
          extensions: Json
          first_seen?: string
          id?: string
          is_malicious?: boolean
          ja3_hash: string
          ja3_string: string
          last_seen?: string
          metadata?: Json
          request_count?: number
          source_ip: unknown
          threat_score?: number
          tls_version: string
        }
        Update: {
          cipher_suites?: Json
          extensions?: Json
          first_seen?: string
          id?: string
          is_malicious?: boolean
          ja3_hash?: string
          ja3_string?: string
          last_seen?: string
          metadata?: Json
          request_count?: number
          source_ip?: unknown
          threat_score?: number
          tls_version?: string
        }
        Relationships: []
      }
      traffic_forecasts: {
        Row: {
          anomaly_probability: number
          confidence_interval: Json
          created_at: string
          feature_importance: Json
          forecast_time: string
          id: string
          model_version: string
          predicted_bandwidth: number
          predicted_requests_per_second: number
          recommended_scaling: Json
          seasonal_factors: Json
        }
        Insert: {
          anomaly_probability?: number
          confidence_interval: Json
          created_at?: string
          feature_importance: Json
          forecast_time: string
          id?: string
          model_version: string
          predicted_bandwidth: number
          predicted_requests_per_second: number
          recommended_scaling: Json
          seasonal_factors: Json
        }
        Update: {
          anomaly_probability?: number
          confidence_interval?: Json
          created_at?: string
          feature_importance?: Json
          forecast_time?: string
          id?: string
          model_version?: string
          predicted_bandwidth?: number
          predicted_requests_per_second?: number
          recommended_scaling?: Json
          seasonal_factors?: Json
        }
        Relationships: []
      }
      user_access_patterns: {
        Row: {
          access_method: string
          authorization_valid: boolean
          created_at: string
          id: string
          ownership_verified: boolean
          resource_id: string
          resource_type: string
          risk_score: number
          session_id: string
          user_id: string | null
        }
        Insert: {
          access_method: string
          authorization_valid: boolean
          created_at?: string
          id?: string
          ownership_verified: boolean
          resource_id: string
          resource_type: string
          risk_score?: number
          session_id: string
          user_id?: string | null
        }
        Update: {
          access_method?: string
          authorization_valid?: boolean
          created_at?: string
          id?: string
          ownership_verified?: boolean
          resource_id?: string
          resource_type?: string
          risk_score?: number
          session_id?: string
          user_id?: string | null
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
      waf_configuration: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      waf_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_name: string
          metric_unit: string | null
          metric_value: number
          timestamp: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          timestamp?: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          timestamp?: string
        }
        Relationships: []
      }
      waf_requests: {
        Row: {
          action: string
          customer_id: string
          id: string
          processing_time_ms: number
          request_method: string
          request_path: string
          request_size: number | null
          response_status: number | null
          rule_matches: string[] | null
          source_ip: unknown
          threat_score: number | null
          threat_type: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          action: string
          customer_id: string
          id?: string
          processing_time_ms: number
          request_method: string
          request_path: string
          request_size?: number | null
          response_status?: number | null
          rule_matches?: string[] | null
          source_ip: unknown
          threat_score?: number | null
          threat_type?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          customer_id?: string
          id?: string
          processing_time_ms?: number
          request_method?: string
          request_path?: string
          request_size?: number | null
          response_status?: number | null
          rule_matches?: string[] | null
          source_ip?: unknown
          threat_score?: number | null
          threat_type?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waf_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_deployments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      evaluate_rule_promotion: {
        Args: Record<PropertyKey, never>
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
