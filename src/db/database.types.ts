// Generated from the Supabase schema (src/db/migrations). Regenerate after schema changes.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          full_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: never
        }
        Relationships: []
      }
      bookings: {
        Row: {
          aadhaar_number: string
          admin_notes: string | null
          amount_inr: number
          booking_code: string
          created_at: string
          delivery_address: string
          dgca_number: string
          email: string
          full_name: string
          id: string
          phone: string
          photo_path: string
          session_id: string
          status: Database["public"]["Enums"]["booking_status"]
          terms_accepted_at: string
          terms_version: string
          updated_at: string
        }
        Insert: {
          aadhaar_number: string
          admin_notes?: string | null
          amount_inr: number
          booking_code: string
          created_at?: string
          delivery_address: string
          dgca_number: string
          email: string
          full_name: string
          id?: string
          phone: string
          photo_path: string
          session_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          terms_accepted_at: string
          terms_version: string
          updated_at?: string
        }
        Update: {
          aadhaar_number?: string
          admin_notes?: string | null
          amount_inr?: number
          booking_code?: string
          created_at?: string
          delivery_address?: string
          dgca_number?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          photo_path?: string
          session_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          terms_accepted_at?: string
          terms_version?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      career_companies: {
        Row: {
          careers_url: string
          created_at: string
          id: string
          name: string
          note: string | null
          published: boolean
          role_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          careers_url: string
          created_at?: string
          id?: string
          name: string
          note?: string | null
          published?: boolean
          role_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          careers_url?: string
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          published?: boolean
          role_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_companies_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "career_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_roles: {
        Row: {
          created_at: string
          enquiry: string
          guide: string | null
          id: string
          name: string
          published: boolean
          slug: string
          sort_order: number
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enquiry: string
          guide?: string | null
          id?: string
          name: string
          published?: boolean
          slug: string
          sort_order?: number
          summary?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enquiry?: string
          guide?: string | null
          id?: string
          name?: string
          published?: boolean
          slug?: string
          sort_order?: number
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      cx3_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          booking_id: string
          id: string
          released_at: string | null
          unit_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          booking_id: string
          id?: string
          released_at?: string | null
          unit_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          booking_id?: string
          id?: string
          released_at?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cx3_assignments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cx3_assignments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "cx3_units"
            referencedColumns: ["id"]
          },
        ]
      }
      cx3_units: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["cx3_unit_status"]
          unit_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["cx3_unit_status"]
          unit_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["cx3_unit_status"]
          unit_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      exam_sessions: {
        Row: {
          created_at: string
          id: string
          name: string
          session_type: Database["public"]["Enums"]["session_type"]
          sort_order: number
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          session_type: Database["public"]["Enums"]["session_type"]
          sort_order?: number
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          session_type?: Database["public"]["Enums"]["session_type"]
          sort_order?: number
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_session_type_fkey"
            columns: ["session_type"]
            isOneToOne: false
            referencedRelation: "rental_prices"
            referencedColumns: ["session_type"]
          },
        ]
      }
      news_articles: {
        Row: {
          ai_model: string | null
          body: string | null
          category: Database["public"]["Enums"]["news_category"]
          created_at: string
          id: string
          image_alt: string | null
          image_credit: string | null
          image_url: string | null
          is_featured: boolean
          keywords: string[]
          meta_description: string | null
          meta_title: string | null
          possible_duplicate_of: string | null
          published_at: string | null
          reviewed_by: string | null
          slug: string | null
          source_id: string | null
          source_name: string
          source_published_at: string | null
          source_summary: string | null
          source_title: string
          source_url: string
          status: Database["public"]["Enums"]["news_status"]
          summary: string | null
          tags: string[]
          title: string | null
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          body?: string | null
          category?: Database["public"]["Enums"]["news_category"]
          created_at?: string
          id?: string
          image_alt?: string | null
          image_credit?: string | null
          image_url?: string | null
          is_featured?: boolean
          keywords?: string[]
          meta_description?: string | null
          meta_title?: string | null
          possible_duplicate_of?: string | null
          published_at?: string | null
          reviewed_by?: string | null
          slug?: string | null
          source_id?: string | null
          source_name: string
          source_published_at?: string | null
          source_summary?: string | null
          source_title: string
          source_url: string
          status?: Database["public"]["Enums"]["news_status"]
          summary?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          body?: string | null
          category?: Database["public"]["Enums"]["news_category"]
          created_at?: string
          id?: string
          image_alt?: string | null
          image_credit?: string | null
          image_url?: string | null
          is_featured?: boolean
          keywords?: string[]
          meta_description?: string | null
          meta_title?: string | null
          possible_duplicate_of?: string | null
          published_at?: string | null
          reviewed_by?: string | null
          slug?: string | null
          source_id?: string | null
          source_name?: string
          source_published_at?: string | null
          source_summary?: string | null
          source_title?: string
          source_url?: string
          status?: Database["public"]["Enums"]["news_status"]
          summary?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_possible_duplicate_of_fkey"
            columns: ["possible_duplicate_of"]
            isOneToOne: false
            referencedRelation: "news_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_articles_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "news_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      news_sources: {
        Row: {
          active: boolean
          created_at: string
          default_category: Database["public"]["Enums"]["news_category"]
          id: string
          last_checked_at: string | null
          name: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_category?: Database["public"]["Enums"]["news_category"]
          id?: string
          last_checked_at?: string | null
          name: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_category?: Database["public"]["Enums"]["news_category"]
          id?: string
          last_checked_at?: string | null
          name?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_inr: number
          booking_id: string
          created_at: string
          gateway_fee_inr: number
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_path: string | null
          status: Database["public"]["Enums"]["payment_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          amount_inr: number
          booking_id: string
          created_at?: string
          gateway_fee_inr?: number
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path?: string | null
          status: Database["public"]["Enums"]["payment_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_inr?: number
          booking_id?: string
          created_at?: string
          gateway_fee_inr?: number
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_prices: {
        Row: {
          amount_inr: number
          session_type: Database["public"]["Enums"]["session_type"]
          updated_at: string
        }
        Insert: {
          amount_inr: number
          session_type: Database["public"]["Enums"]["session_type"]
          updated_at?: string
        }
        Update: {
          amount_inr?: number
          session_type?: Database["public"]["Enums"]["session_type"]
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          awb_number: string | null
          booking_id: string
          courier: string | null
          created_at: string
          direction: Database["public"]["Enums"]["shipment_direction"]
          dispatch_date: string | null
          expected_delivery_date: string | null
          id: string
          pickup_date: string | null
          received_date: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          awb_number?: string | null
          booking_id: string
          courier?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["shipment_direction"]
          dispatch_date?: string | null
          expected_delivery_date?: string | null
          id?: string
          pickup_date?: string | null
          received_date?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          awb_number?: string | null
          booking_id?: string
          courier?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["shipment_direction"]
          dispatch_date?: string | null
          expected_delivery_date?: string | null
          id?: string
          pickup_date?: string | null
          received_date?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_assign_unit: {
        Args: { p_booking_code: string; p_unit_id: string }
        Returns: Database["public"]["Enums"]["booking_status"]
      }
      admin_review_payment: {
        Args: { p_approve: boolean; p_booking_code: string; p_reason?: string }
        Returns: Database["public"]["Enums"]["booking_status"]
      }
      admin_save_shipment: {
        Args: {
          p_awb_number: string
          p_booking_code: string
          p_courier: string
          p_direction: Database["public"]["Enums"]["shipment_direction"]
          p_dispatch_date: string
          p_expected_delivery_date: string
          p_pickup_date: string
          p_received_date: string
          p_status: Database["public"]["Enums"]["shipment_status"]
          p_tracking_url: string
        }
        Returns: Database["public"]["Enums"]["booking_status"]
      }
      admin_set_booking_status: {
        Args: {
          p_booking_code: string
          p_status: Database["public"]["Enums"]["booking_status"]
        }
        Returns: Database["public"]["Enums"]["booking_status"]
      }
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      create_booking: {
        Args: {
          p_aadhaar_number: string
          p_delivery_address: string
          p_dgca_number: string
          p_email: string
          p_full_name: string
          p_phone: string
          p_photo_path: string
          p_session_id: string
          p_terms_version: string
        }
        Returns: {
          amount_inr: number
          booking_code: string
          session_name: string
        }[]
      }
      ingest_news_item: {
        Args: {
          p_category: Database["public"]["Enums"]["news_category"]
          p_source_id: string
          p_source_name: string
          p_source_published_at: string
          p_source_summary: string
          p_source_title: string
          p_source_url: string
        }
        Returns: Json
      }
      save_news_draft: {
        Args: {
          p_ai_model: string
          p_article_id: string
          p_body: string
          p_category: string
          p_keywords: string[]
          p_meta_description: string
          p_meta_title: string
          p_relevant: boolean
          p_slug: string
          p_summary: string
          p_tags: string[]
          p_title: string
        }
        Returns: Json
      }
      submit_payment_proof: {
        Args: {
          p_booking_code: string
          p_phone: string
          p_screenshot_path: string
        }
        Returns: Database["public"]["Enums"]["booking_status"]
      }
      track_booking: {
        Args: { p_booking_code: string; p_contact: string }
        Returns: Json
      }
    }
    Enums: {
      booking_status:
        | "payment_pending"
        | "payment_review"
        | "confirmed"
        | "cx3_assigned"
        | "dispatched"
        | "in_transit"
        | "out_for_delivery"
        | "delivered"
        | "return_pickup_scheduled"
        | "return_in_transit"
        | "cx3_received"
        | "closed"
        | "cancelled"
      cx3_unit_status:
        | "available"
        | "assigned"
        | "with_customer"
        | "maintenance"
        | "retired"
      news_category:
        | "dgca_updates"
        | "dgca_exam_updates"
        | "aviation_industry"
        | "pilot_news"
        | "regulations"
        | "aviation_training"
        | "defence_aviation"
        | "interesting_stories"
      news_status:
        | "detected"
        | "draft"
        | "review"
        | "approved"
        | "published"
        | "rejected"
      payment_method: "upi" | "razorpay"
      payment_status:
        | "awaiting_payment"
        | "pending_verification"
        | "verified"
        | "rejected"
      session_status:
        | "available"
        | "sold_out"
        | "temporarily_unavailable"
        | "hidden"
      session_type: "OLODE" | "REGULAR"
      shipment_direction: "outbound" | "return"
      shipment_status:
        | "pending"
        | "pickup_scheduled"
        | "dispatched"
        | "in_transit"
        | "out_for_delivery"
        | "delivered"
        | "received"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
