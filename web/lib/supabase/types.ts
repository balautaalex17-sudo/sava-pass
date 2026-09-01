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
      applicants: {
        Row: {
          applied_at: string
          email: string
          id: string
          name: string
          school: string | null
          slot: string | null
          status: Database["public"]["Enums"]["applicant_status"]
          track: string | null
        }
        Insert: {
          applied_at?: string
          email: string
          id?: string
          name: string
          school?: string | null
          slot?: string | null
          status?: Database["public"]["Enums"]["applicant_status"]
          track?: string | null
        }
        Update: {
          applied_at?: string
          email?: string
          id?: string
          name?: string
          school?: string | null
          slot?: string | null
          status?: Database["public"]["Enums"]["applicant_status"]
          track?: string | null
        }
        Relationships: []
      }
      application_evaluations: {
        Row: {
          application_id: string
          base_score: number | null
          bonus_points: number
          comment: string
          created_at: string
          id: string
          question_scores: Json
          rating: string
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          application_id: string
          base_score?: number | null
          bonus_points?: number
          comment: string
          created_at?: string
          id?: string
          question_scores?: Json
          rating: string
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          base_score?: number | null
          bonus_points?: number
          comment?: string
          created_at?: string
          id?: string
          question_scores?: Json
          rating?: string
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_evaluations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "membership_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_evaluations_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_events: {
        Row: {
          actor_id: string | null
          application_id: string
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string
          visible_to_candidate: boolean
        }
        Insert: {
          actor_id?: string | null
          application_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status: string
          visible_to_candidate?: boolean
        }
        Update: {
          actor_id?: string | null
          application_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string
          visible_to_candidate?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "application_status_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_status_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "membership_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_corrections: {
        Row: {
          actor_id: string
          attendance_id: string
          created_at: string
          id: string
          meeting_id: string
          member_id: string
          new_status: string
          previous_status: string
          reason: string
        }
        Insert: {
          actor_id: string
          attendance_id: string
          created_at?: string
          id?: string
          meeting_id: string
          member_id: string
          new_status: string
          previous_status: string
          reason: string
        }
        Update: {
          actor_id?: string
          attendance_id?: string
          created_at?: string
          id?: string
          meeting_id?: string
          member_id?: string
          new_status?: string
          previous_status?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "meeting_attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_scans: {
        Row: {
          device_metadata: Json
          error_code: string | null
          id: string
          meeting_id: string
          member_id: string | null
          result: string
          scanned_at: string
          scanner_user_id: string
          token_fingerprint: string
        }
        Insert: {
          device_metadata?: Json
          error_code?: string | null
          id?: string
          meeting_id: string
          member_id?: string | null
          result: string
          scanned_at?: string
          scanner_user_id: string
          token_fingerprint: string
        }
        Update: {
          device_metadata?: Json
          error_code?: string | null
          id?: string
          meeting_id?: string
          member_id?: string | null
          result?: string
          scanned_at?: string
          scanner_user_id?: string
          token_fingerprint?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_scans_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_scans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_scans_scanner_user_id_fkey"
            columns: ["scanner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_payment_confirmations: {
        Row: {
          amount_bani: number
          confirmed_by: string
          created_at: string
          id: string
          order_id: string
          previous_order_status: Database["public"]["Enums"]["order_status"]
          reason: string
          ticket_id: string
        }
        Insert: {
          amount_bani: number
          confirmed_by: string
          created_at?: string
          id?: string
          order_id: string
          previous_order_status: Database["public"]["Enums"]["order_status"]
          reason?: string
          ticket_id: string
        }
        Update: {
          amount_bani?: number
          confirmed_by?: string
          created_at?: string
          id?: string
          order_id?: string
          previous_order_status?: Database["public"]["Enums"]["order_status"]
          reason?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_payment_confirmations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_payment_confirmations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_payment_confirmations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          handled: boolean
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          handled?: boolean
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          handled?: boolean
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      event_ticket_types: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          event_id: string
          id: string
          name: string
          price_bani: number
          sales_end_at: string | null
          sales_start_at: string | null
          slug: string
          sort: number
          status: string
          updated_at: string
        }
        Insert: {
          capacity: number
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
          price_bani: number
          sales_end_at?: string | null
          sales_start_at?: string | null
          slug: string
          sort?: number
          status?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          price_bani?: number
          sales_end_at?: string | null
          sales_start_at?: string | null
          slug?: string
          sort?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          about: string | null
          accent: string | null
          capacity: number
          created_at: string
          date_label: string
          date_long: string
          doors: string
          ends_at: string
          featured_slot: number | null
          id: string
          manually_ended_at: string | null
          perks: Json
          photo_url: string | null
          price_bani: number
          program: Json
          slug: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          subtitle: string | null
          title: string
          venue: string
          venue_line: string | null
        }
        Insert: {
          about?: string | null
          accent?: string | null
          capacity: number
          created_at?: string
          date_label: string
          date_long: string
          doors?: string
          ends_at: string
          featured_slot?: number | null
          id?: string
          manually_ended_at?: string | null
          perks?: Json
          photo_url?: string | null
          price_bani: number
          program?: Json
          slug: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          subtitle?: string | null
          title: string
          venue: string
          venue_line?: string | null
        }
        Update: {
          about?: string | null
          accent?: string | null
          capacity?: number
          created_at?: string
          date_label?: string
          date_long?: string
          doors?: string
          ends_at?: string
          featured_slot?: number | null
          id?: string
          manually_ended_at?: string | null
          perks?: Json
          photo_url?: string | null
          price_bani?: number
          program?: Json
          slug?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          subtitle?: string | null
          title?: string
          venue?: string
          venue_line?: string | null
        }
        Relationships: []
      }
      interview_changes: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          interview_id: string
          new_slot_id: string | null
          old_slot_id: string | null
          reason: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          interview_id: string
          new_slot_id?: string | null
          old_slot_id?: string | null
          reason?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          interview_id?: string
          new_slot_id?: string | null
          old_slot_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_changes_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_changes_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_changes_new_slot_id_fkey"
            columns: ["new_slot_id"]
            isOneToOne: false
            referencedRelation: "interview_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_changes_old_slot_id_fkey"
            columns: ["old_slot_id"]
            isOneToOne: false
            referencedRelation: "interview_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_evaluations: {
        Row: {
          category_scores: Json
          comment: string
          created_at: string
          id: string
          interview_id: string
          interviewer_id: string | null
          question_scores: Json
          rating: string
          red_flag: boolean
          score: number | null
          selected_sets: Json
          updated_at: string
        }
        Insert: {
          category_scores?: Json
          comment: string
          created_at?: string
          id?: string
          interview_id: string
          interviewer_id?: string | null
          question_scores?: Json
          rating: string
          red_flag?: boolean
          score?: number | null
          selected_sets?: Json
          updated_at?: string
        }
        Update: {
          category_scores?: Json
          comment?: string
          created_at?: string
          id?: string
          interview_id?: string
          interviewer_id?: string | null
          question_scores?: Json
          rating?: string
          red_flag?: boolean
          score?: number | null
          selected_sets?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_evaluations_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_evaluations_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_interviewers: {
        Row: {
          assigned_at: string
          committee_role: string | null
          interview_id: string
          profile_id: string
          slot_id: string
        }
        Insert: {
          assigned_at?: string
          committee_role?: string | null
          interview_id: string
          profile_id: string
          slot_id: string
        }
        Update: {
          assigned_at?: string
          committee_role?: string | null
          interview_id?: string
          profile_id?: string
          slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_interviewers_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_interviewers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_interviewers_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "interview_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_periods: {
        Row: {
          active: boolean
          campaign_id: string
          created_at: string
          default_location: string | null
          default_meeting_url: string | null
          ends_at: string
          id: string
          slot_duration_minutes: number
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          campaign_id: string
          created_at?: string
          default_location?: string | null
          default_meeting_url?: string | null
          ends_at: string
          id?: string
          slot_duration_minutes?: number
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          campaign_id?: string
          created_at?: string
          default_location?: string | null
          default_meeting_url?: string | null
          ends_at?: string
          id?: string
          slot_duration_minutes?: number
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_periods_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "recruitment_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_slots: {
        Row: {
          active: boolean
          capacity: number
          created_at: string
          ends_at: string
          id: string
          meeting_url: string | null
          period_id: string
          room: string | null
          starts_at: string
        }
        Insert: {
          active?: boolean
          capacity?: number
          created_at?: string
          ends_at: string
          id?: string
          meeting_url?: string | null
          period_id: string
          room?: string | null
          starts_at: string
        }
        Update: {
          active?: boolean
          capacity?: number
          created_at?: string
          ends_at?: string
          id?: string
          meeting_url?: string | null
          period_id?: string
          room?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_slots_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "interview_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          arrival_status: string
          completed_at: string | null
          created_at: string
          decision: string | null
          id: string
          location: string | null
          meeting_url: string | null
          private_notes: string | null
          rescheduled_at: string | null
          scheduled_at: string | null
          score: number | null
          slot_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          arrival_status?: string
          completed_at?: string | null
          created_at?: string
          decision?: string | null
          id?: string
          location?: string | null
          meeting_url?: string | null
          private_notes?: string | null
          rescheduled_at?: string | null
          scheduled_at?: string | null
          score?: number | null
          slot_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          arrival_status?: string
          completed_at?: string | null
          created_at?: string
          decision?: string | null
          id?: string
          location?: string | null
          meeting_url?: string | null
          private_notes?: string | null
          rescheduled_at?: string | null
          scheduled_at?: string | null
          score?: number | null
          slot_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "membership_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "interview_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string
          archived: boolean
          category: string
          created_at: string
          created_by: string | null
          crop_safe: boolean
          duration_ms: number | null
          excluded: boolean
          faces_visible: boolean
          file_name: string
          focal_x: number
          focal_y: number
          generation_job_id: string | null
          generation_prompt: string | null
          generation_tool: string | null
          height: number | null
          id: string
          mime_type: string
          mood: string | null
          orientation: string
          poster_asset_id: string | null
          public_url: string
          quality_score: number
          sha256: string | null
          sharpness_score: number | null
          size_bytes: number | null
          source_kind: string
          storage_path: string | null
          subjects: string | null
          tags: string[]
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text: string
          archived?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          crop_safe?: boolean
          duration_ms?: number | null
          excluded?: boolean
          faces_visible?: boolean
          file_name: string
          focal_x?: number
          focal_y?: number
          generation_job_id?: string | null
          generation_prompt?: string | null
          generation_tool?: string | null
          height?: number | null
          id?: string
          mime_type: string
          mood?: string | null
          orientation?: string
          poster_asset_id?: string | null
          public_url: string
          quality_score?: number
          sha256?: string | null
          sharpness_score?: number | null
          size_bytes?: number | null
          source_kind?: string
          storage_path?: string | null
          subjects?: string | null
          tags?: string[]
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_text?: string
          archived?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          crop_safe?: boolean
          duration_ms?: number | null
          excluded?: boolean
          faces_visible?: boolean
          file_name?: string
          focal_x?: number
          focal_y?: number
          generation_job_id?: string | null
          generation_prompt?: string | null
          generation_tool?: string | null
          height?: number | null
          id?: string
          mime_type?: string
          mood?: string | null
          orientation?: string
          poster_asset_id?: string | null
          public_url?: string
          quality_score?: number
          sha256?: string | null
          sharpness_score?: number | null
          size_bytes?: number | null
          source_kind?: string
          storage_path?: string | null
          subjects?: string | null
          tags?: string[]
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_poster_asset_id_fkey"
            columns: ["poster_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_placements: {
        Row: {
          auto_select: boolean
          desktop_crop: Json
          excluded_asset_ids: string[]
          id: string
          mobile_crop: Json
          page_type: string
          pinned_asset_id: string | null
          selected_asset_id: string | null
          selection_reason: string | null
          slot: string
          target_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_select?: boolean
          desktop_crop?: Json
          excluded_asset_ids?: string[]
          id?: string
          mobile_crop?: Json
          page_type: string
          pinned_asset_id?: string | null
          selected_asset_id?: string | null
          selection_reason?: string | null
          slot: string
          target_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_select?: boolean
          desktop_crop?: Json
          excluded_asset_ids?: string[]
          id?: string
          mobile_crop?: Json
          page_type?: string
          pinned_asset_id?: string | null
          selected_asset_id?: string | null
          selection_reason?: string | null
          slot?: string
          target_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_placements_pinned_asset_id_fkey"
            columns: ["pinned_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_placements_selected_asset_id_fkey"
            columns: ["selected_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_placements_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendance: {
        Row: {
          checked_in_at: string
          checked_in_by: string
          created_at: string
          id: string
          meeting_id: string
          member_id: string
          scan_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          checked_in_at?: string
          checked_in_by: string
          created_at?: string
          id?: string
          meeting_id: string
          member_id: string
          scan_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          checked_in_at?: string
          checked_in_by?: string
          created_at?: string
          id?: string
          meeting_id?: string
          member_id?: string
          scan_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendance_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "attendance_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          attendance_closes_at: string
          attendance_opens_at: string
          created_at: string
          created_by: string
          description: string
          ends_at: string
          id: string
          location: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attendance_closes_at: string
          attendance_opens_at: string
          created_at?: string
          created_by: string
          description?: string
          ends_at: string
          id?: string
          location: string
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attendance_closes_at?: string
          attendance_opens_at?: string
          created_at?: string
          created_by?: string
          description?: string
          ends_at?: string
          id?: string
          location?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_applications: {
        Row: {
          answers: Json
          availability: string | null
          campaign_id: string | null
          completion_percentage: number
          created_at: string
          email: string
          form_id: string
          full_name: string
          grade: string | null
          id: string
          import_id: string | null
          is_complete: boolean
          missing_required_fields: string[]
          motivation: string
          phone: string
          private_notes: string | null
          public_token: string
          result_message: string | null
          reviewer_id: string | null
          score: number | null
          source: string
          source_payload: Json
          source_row_identifier: string | null
          status: string
          strength: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          availability?: string | null
          campaign_id?: string | null
          completion_percentage?: number
          created_at?: string
          email: string
          form_id: string
          full_name: string
          grade?: string | null
          id?: string
          import_id?: string | null
          is_complete?: boolean
          missing_required_fields?: string[]
          motivation: string
          phone: string
          private_notes?: string | null
          public_token?: string
          result_message?: string | null
          reviewer_id?: string | null
          score?: number | null
          source?: string
          source_payload?: Json
          source_row_identifier?: string | null
          status?: string
          strength?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          availability?: string | null
          campaign_id?: string | null
          completion_percentage?: number
          created_at?: string
          email?: string
          form_id?: string
          full_name?: string
          grade?: string | null
          id?: string
          import_id?: string | null
          is_complete?: boolean
          missing_required_fields?: string[]
          motivation?: string
          phone?: string
          private_notes?: string | null
          public_token?: string
          result_message?: string | null
          reviewer_id?: string | null
          score?: number | null
          source?: string
          source_payload?: Json
          source_row_identifier?: string | null
          status?: string
          strength?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_applications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "recruitment_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "recruitment_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "recruitment_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          active: boolean
          body_template: string
          category: string
          channel: string
          key: string
          label: string
          subject_template: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          body_template: string
          category: string
          channel?: string
          key: string
          label: string
          subject_template?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          body_template?: string
          category?: string
          channel?: string
          key?: string
          label?: string
          subject_template?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          application_id: string | null
          attempts: number
          body: string
          channel: string
          created_at: string
          created_by: string | null
          id: string
          interview_id: string | null
          last_error: string | null
          metadata: Json
          order_id: string | null
          provider_id: string | null
          recipient_email: string
          recipient_name: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string | null
          template_key: string | null
          ticket_id: string | null
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          attempts?: number
          body: string
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          interview_id?: string | null
          last_error?: string | null
          metadata?: Json
          order_id?: string | null
          provider_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_key?: string | null
          ticket_id?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          attempts?: number
          body?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          interview_id?: string | null
          last_error?: string | null
          metadata?: Json
          order_id?: string | null
          provider_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_key?: string | null
          ticket_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "membership_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_template_key_fkey"
            columns: ["template_key"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_bani: number
          buyer_email: string
          buyer_name: string
          buyer_phone: string | null
          created_at: string
          currency: string
          event_id: string
          id: string
          paid_at: string | null
          quantity: number
          request_key: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          ticket_type_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_bani: number
          buyer_email: string
          buyer_name: string
          buyer_phone?: string | null
          created_at?: string
          currency?: string
          event_id: string
          id?: string
          paid_at?: string | null
          quantity?: number
          request_key?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          ticket_type_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_bani?: number
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string | null
          created_at?: string
          currency?: string
          event_id?: string
          id?: string
          paid_at?: string | null
          quantity?: number
          request_key?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          ticket_type_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      public_rate_limits: {
        Row: {
          attempts: number
          key_hash: string
          scope: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          attempts?: number
          key_hash: string
          scope: string
          updated_at?: string
          window_started_at: string
        }
        Update: {
          attempts?: number
          key_hash?: string
          scope?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string
          key: string
          label: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          key: string
          label: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      profile_permission_overrides: {
        Row: {
          allowed: boolean
          permission_key: string
          profile_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed: boolean
          permission_key: string
          profile_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed?: boolean
          permission_key?: string
          profile_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_permission_overrides_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "profile_permission_overrides_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_permission_overrides_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          profile_id: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          profile_id: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profile_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          grade: string | null
          id: string
          member_ref: string
          membership_status: string
          phone: string | null
          role: Database["public"]["Enums"]["staff_role"] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          grade?: string | null
          id: string
          member_ref?: string
          membership_status?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          grade?: string | null
          id?: string
          member_ref?: string
          membership_status?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          beneficiary: string | null
          body: string | null
          category: string | null
          cover_path: string | null
          created_at: string
          date_label: string | null
          event_id: string | null
          gallery: Json
          id: string
          location: string | null
          published: boolean
          slug: string
          sort: number
          summary: string | null
          title: string
        }
        Insert: {
          beneficiary?: string | null
          body?: string | null
          category?: string | null
          cover_path?: string | null
          created_at?: string
          date_label?: string | null
          event_id?: string | null
          gallery?: Json
          id?: string
          location?: string | null
          published?: boolean
          slug: string
          sort?: number
          summary?: string | null
          title: string
        }
        Update: {
          beneficiary?: string | null
          body?: string | null
          category?: string | null
          cover_path?: string | null
          created_at?: string
          date_label?: string | null
          event_id?: string | null
          gallery?: Json
          id?: string
          location?: string | null
          published?: boolean
          slug?: string
          sort?: number
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "projects_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_campaigns: {
        Row: {
          application_limit: number | null
          closed_message: string
          closes_at: string | null
          created_at: string
          eyebrow: string | null
          id: string
          intro: string
          opens_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          application_limit?: number | null
          closed_message?: string
          closes_at?: string | null
          created_at?: string
          eyebrow?: string | null
          id?: string
          intro: string
          opens_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          application_limit?: number | null
          closed_message?: string
          closes_at?: string | null
          created_at?: string
          eyebrow?: string | null
          id?: string
          intro?: string
          opens_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_campaigns_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_departments: {
        Row: {
          active: boolean
          campaign_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort: number
          summary: string
        }
        Insert: {
          active?: boolean
          campaign_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort?: number
          summary: string
        }
        Update: {
          active?: boolean
          campaign_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort?: number
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_departments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "recruitment_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_fields: {
        Row: {
          conditional_rules: Json | null
          created_at: string
          form_id: string
          id: string
          is_system: boolean
          key: string
          label: string
          options: Json
          position: number
          required: boolean
          source_header: string
          type: string
          updated_at: string
        }
        Insert: {
          conditional_rules?: Json | null
          created_at?: string
          form_id: string
          id?: string
          is_system?: boolean
          key: string
          label: string
          options?: Json
          position: number
          required?: boolean
          source_header: string
          type: string
          updated_at?: string
        }
        Update: {
          conditional_rules?: Json | null
          created_at?: string
          form_id?: string
          id?: string
          is_system?: boolean
          key?: string
          label?: string
          options?: Json
          position?: number
          required?: boolean
          source_header?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "recruitment_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_forms: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          version: number
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_forms_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "recruitment_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_imports: {
        Row: {
          committed_at: string | null
          created_at: string
          created_by: string
          detected_headers: Json
          field_mapping: Json
          file_name: string
          file_sha256: string
          form_id: string
          id: string
          staged_rows: Json
          status: string
          summary: Json
        }
        Insert: {
          committed_at?: string | null
          created_at?: string
          created_by: string
          detected_headers: Json
          field_mapping?: Json
          file_name: string
          file_sha256: string
          form_id: string
          id?: string
          staged_rows?: Json
          status?: string
          summary?: Json
        }
        Update: {
          committed_at?: string | null
          created_at?: string
          created_by?: string
          detected_headers?: Json
          field_mapping?: Json
          file_name?: string
          file_sha256?: string
          form_id?: string
          id?: string
          staged_rows?: Json
          status?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_imports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_imports_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "recruitment_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_key: string
          role_key: string
        }
        Insert: {
          created_at?: string
          permission_key: string
          role_key: string
        }
        Update: {
          created_at?: string
          permission_key?: string
          role_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      scan_rate_limits: {
        Row: {
          actor_id: string
          attempts: number
          scope: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          actor_id: string
          attempts?: number
          scope: string
          updated_at?: string
          window_started_at: string
        }
        Update: {
          actor_id?: string
          attempts?: number
          scope?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_rate_limits_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          action: string
          created_at: string
          device_metadata: Json
          error_code: string | null
          event_id: string
          id: string
          new_status: string | null
          previous_status: string | null
          result: string
          scanned_by: string
          ticket_id: string | null
          token_fingerprint: string | null
        }
        Insert: {
          action?: string
          created_at?: string
          device_metadata?: Json
          error_code?: string | null
          event_id: string
          id?: string
          new_status?: string | null
          previous_status?: string | null
          result: string
          scanned_by: string
          ticket_id?: string | null
          token_fingerprint?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          device_metadata?: Json
          error_code?: string | null
          event_id?: string
          id?: string
          new_status?: string | null
          previous_status?: string | null
          result?: string
          scanned_by?: string
          ticket_id?: string | null
          token_fingerprint?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          active: boolean
          created_at: string
          id: string
          logo_path: string | null
          name: string
          sort: number
          tier: string
          url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          logo_path?: string | null
          name: string
          sort?: number
          tier?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          logo_path?: string | null
          name?: string
          sort?: number
          tier?: string
          url?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          active: boolean
          bio: string | null
          created_at: string
          id: string
          mandate: string | null
          name: string
          photo_path: string | null
          role: string
          sort: number
        }
        Insert: {
          active?: boolean
          bio?: string | null
          created_at?: string
          id?: string
          mandate?: string | null
          name: string
          photo_path?: string | null
          role: string
          sort?: number
        }
        Update: {
          active?: boolean
          bio?: string | null
          created_at?: string
          id?: string
          mandate?: string | null
          name?: string
          photo_path?: string | null
          role?: string
          sort?: number
        }
        Relationships: []
      }
      tickets: {
        Row: {
          checked_in_at: string | null
          code: string
          event_id: string
          expires_at: string | null
          holder_email: string
          holder_name: string
          holder_phone: string | null
          id: string
          issued_at: string
          order_id: string
          payment_confirmed_at: string | null
          payment_confirmed_by: string | null
          qr_token: string
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_type_id: string | null
          user_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          code: string
          event_id: string
          expires_at?: string | null
          holder_email: string
          holder_name: string
          holder_phone?: string | null
          id?: string
          issued_at?: string
          order_id: string
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          qr_token: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_type_id?: string | null
          user_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          code?: string
          event_id?: string
          expires_at?: string | null
          holder_email?: string
          holder_name?: string
          holder_phone?: string | null
          id?: string
          issued_at?: string
          order_id?: string
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          qr_token?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_type_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_payment_confirmed_by_fkey"
            columns: ["payment_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      event_stats: {
        Row: {
          checked_in: number | null
          event_id: string | null
          sold: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_assign_featured_slot: {
        Args: {
          expected_occupant_id?: string
          target_id: string
          target_slot: number
        }
        Returns: undefined
      }
      admin_end_event: { Args: { target_id: string }; Returns: boolean }
      admin_remove_featured_slot: {
        Args: { expected_slot: number; target_id: string }
        Returns: boolean
      }
      admin_set_event_status: {
        Args: {
          target_id: string
          target_status: Database["public"]["Enums"]["event_status"]
        }
        Returns: undefined
      }
      configure_recruitment_campaign: {
        Args: {
          p_actor_id: string
          p_campaign_id: string
          p_closed_message: string
          p_closes_at: string
          p_intro: string
          p_opens_at: string
          p_status: string
          p_title: string
        }
        Returns: {
          application_limit: number | null
          closed_message: string
          closes_at: string | null
          created_at: string
          eyebrow: string | null
          id: string
          intro: string
          opens_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "recruitment_campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_in_ticket: {
        Args: {
          p_actor_id: string
          p_device_metadata?: Json
          p_ticket_id: string
          p_token_fingerprint: string
        }
        Returns: Json
      }
      claim_member_activation_code: {
        Args: { p_claim_id: string; p_code_hash: string; p_email: string }
        Returns: string
      }
      claim_due_notifications: {
        Args: { p_limit?: number }
        Returns: { id: string }[]
      }
      confirm_cash_payment: {
        Args: {
          p_actor_id: string
          p_device_metadata?: Json
          p_reason?: string
          p_ticket_id: string
          p_token_fingerprint: string
        }
        Returns: Json
      }
      consume_dashboard_rate_limit: {
        Args: {
          p_actor_id: string
          p_limit?: number
          p_scope: string
          p_window_seconds?: number
        }
        Returns: boolean
      }
      consume_public_rate_limit: {
        Args: {
          p_key_hash: string
          p_limit: number
          p_scope: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      correct_meeting_attendance: {
        Args: {
          p_actor_id: string
          p_meeting_id: string
          p_member_id: string
          p_new_status: string
          p_reason: string
        }
        Returns: Json
      }
      finish_member_activation_code: {
        Args: { p_claim_id: string; p_user_id: string }
        Returns: boolean
      }
      issue_member_activation_code: {
        Args: { p_code_hash: string; p_email: string; p_user_id: string }
        Returns: boolean
      }
      record_meeting_attendance: {
        Args: {
          p_device_metadata?: Json
          p_meeting_id: string
          p_member_ref: string
          p_scanner_user_id: string
          p_token_fingerprint: string
        }
        Returns: Json
      }
      release_member_activation_code: {
        Args: { p_claim_id: string; p_user_id: string }
        Returns: boolean
      }
      reserve_public_ticket: {
        Args: {
          p_event_id: string
          p_holder_email: string
          p_holder_name: string
          p_order_id: string
          p_qr_token: string
          p_request_key: string
          p_ticket_code: string
          p_ticket_id: string
          p_ticket_type_id: string
        }
        Returns: Json
      }
      run_security_maintenance: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      set_profile_board_role: {
        Args: {
          p_actor_id: string
          p_board_enabled: boolean
          p_profile_id: string
        }
        Returns: Database["public"]["Enums"]["staff_role"]
      }
      set_profile_operational_roles: {
        Args: {
          p_actor_id: string
          p_profile_id: string
          p_roles: Database["public"]["Enums"]["staff_role"][]
        }
        Returns: Database["public"]["Enums"]["staff_role"][]
      }
      version_recruitment_questions: {
        Args: { p_campaign_id: string; p_questions: Json }
        Returns: string
      }
    }
    Enums: {
      applicant_status:
        | "submitted"
        | "reviewing"
        | "interview_invited"
        | "interview_scheduled"
        | "accepted"
        | "rejected"
      event_status: "draft" | "active" | "past"
      order_status: "pending" | "paid" | "failed" | "refunded"
      staff_role: "admin" | "scanner" | "statistici" | "interviewer" | "board"
      ticket_status:
        | "reserved"
        | "paid"
        | "checked_in"
        | "cancelled"
        | "expired"
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
      applicant_status: [
        "submitted",
        "reviewing",
        "interview_invited",
        "interview_scheduled",
        "accepted",
        "rejected",
      ],
      event_status: ["draft", "active", "past"],
      order_status: ["pending", "paid", "failed", "refunded"],
      staff_role: ["admin", "scanner", "statistici", "interviewer", "board"],
      ticket_status: ["reserved", "paid", "checked_in", "cancelled", "expired"],
    },
  },
} as const

export type Event = Tables<"events">
export type EventTicketType = Tables<"event_ticket_types">
export type Ticket = Tables<"tickets">
export type Order = Tables<"orders">
export type Scan = Tables<"scans">
export type Profile = Tables<"profiles">
export type EventStats = Database["public"]["Views"]["event_stats"]["Row"]
export type MembershipApplication = Tables<"membership_applications">
export type RecruitmentForm = Tables<"recruitment_forms">
export type RecruitmentField = Tables<"recruitment_fields">
export type RecruitmentImport = Tables<"recruitment_imports">
export type Meeting = Tables<"meetings">
export type MeetingAttendance = Tables<"meeting_attendance">
export type AttendanceScan = Tables<"attendance_scans">
export type ApplicationEvaluation = Tables<"application_evaluations">
export type InterviewEvaluation = Tables<"interview_evaluations">
export type TeamMember = Tables<"team_members">
export type Project = Tables<"projects">
export type Sponsor = Tables<"sponsors">
export type ContactMessage = Tables<"contact_messages">
export type SiteContent = Tables<"site_content">
export type MediaAsset = Tables<"media_assets">
