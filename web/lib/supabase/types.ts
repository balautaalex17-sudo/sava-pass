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
      events: {
        Row: {
          about: string | null
          accent: string | null
          capacity: number
          created_at: string
          date_label: string
          date_long: string
          doors: string
          id: string
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
          id?: string
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
          id?: string
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
      orders: {
        Row: {
          amount_bani: number
          buyer_email: string
          buyer_name: string
          created_at: string
          currency: string
          event_id: string
          id: string
          paid_at: string | null
          quantity: number
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_bani: number
          buyer_email: string
          buyer_name: string
          created_at?: string
          currency?: string
          event_id: string
          id?: string
          paid_at?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_bani?: number
          buyer_email?: string
          buyer_name?: string
          created_at?: string
          currency?: string
          event_id?: string
          id?: string
          paid_at?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
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
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: []
      }
      scans: {
        Row: {
          created_at: string
          event_id: string
          id: string
          result: Database["public"]["Enums"]["scan_result"]
          scanned_by: string
          ticket_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          result: Database["public"]["Enums"]["scan_result"]
          scanned_by: string
          ticket_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          result?: Database["public"]["Enums"]["scan_result"]
          scanned_by?: string
          ticket_id?: string | null
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
      tickets: {
        Row: {
          checked_in_at: string | null
          code: string
          event_id: string
          holder_email: string
          holder_name: string
          id: string
          issued_at: string
          order_id: string
          qr_token: string
          status: Database["public"]["Enums"]["ticket_status"]
          user_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          code: string
          event_id: string
          holder_email: string
          holder_name: string
          id?: string
          issued_at?: string
          order_id: string
          qr_token: string
          status?: Database["public"]["Enums"]["ticket_status"]
          user_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          code?: string
          event_id?: string
          holder_email?: string
          holder_name?: string
          id?: string
          issued_at?: string
          order_id?: string
          qr_token?: string
          status?: Database["public"]["Enums"]["ticket_status"]
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
      admin_set_event_status: {
        Args: {
          target_id: string
          target_status: Database["public"]["Enums"]["event_status"]
        }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
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
      scan_result:
        | "ok"
        | "already_in"
        | "already_used"
        | "invalid"
        | "void_ticket"
      staff_role: "admin" | "scanner" | "statistici"
      ticket_status: "valid" | "in" | "used" | "void"
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
      scan_result: [
        "ok",
        "already_in",
        "already_used",
        "invalid",
        "void_ticket",
      ],
      staff_role: ["admin", "scanner", "statistici"],
      ticket_status: ["valid", "in", "used", "void"],
    },
  },
} as const

export type Event = Tables<"events">
export type Ticket = Tables<"tickets">
export type Order = Tables<"orders">
export type Scan = Tables<"scans">
export type Profile = Tables<"profiles">
export type EventStats = Database["public"]["Views"]["event_stats"]["Row"]
