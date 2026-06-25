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
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          category: string | null
          created_at: string
          emoji: string | null
          gradient: string | null
          id: string
          image: string | null
          name: string
          prev_price: number | null
          price: number
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          emoji?: string | null
          gradient?: string | null
          id?: string
          image?: string | null
          name: string
          prev_price?: number | null
          price: number
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          emoji?: string | null
          gradient?: string | null
          id?: string
          image?: string | null
          name?: string
          prev_price?: number | null
          price?: number
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      credit_repayments: {
        Row: {
          amount: number
          created_at: string
          credit_request_id: string
          id: string
          notes: string | null
          paid_on: string
          recorded_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          credit_request_id: string
          id?: string
          notes?: string | null
          paid_on?: string
          recorded_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          credit_request_id?: string
          id?: string
          notes?: string | null
          paid_on?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_repayments_credit_request_id_fkey"
            columns: ["credit_request_id"]
            isOneToOne: false
            referencedRelation: "credit_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_requests: {
        Row: {
          amount: number
          approved_amount: number | null
          created_at: string
          employee_id: string
          id: string
          member_name: string
          monthly_repayment: number
          outstanding_balance: number
          purpose: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["credit_status"]
          tenure_months: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_amount?: number | null
          created_at?: string
          employee_id: string
          id?: string
          member_name: string
          monthly_repayment: number
          outstanding_balance?: number
          purpose?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["credit_status"]
          tenure_months: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_amount?: number | null
          created_at?: string
          employee_id?: string
          id?: string
          member_name?: string
          monthly_repayment?: number
          outstanding_balance?: number
          purpose?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["credit_status"]
          tenure_months?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      live_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["live_message_kind"]
          metadata: Json | null
          session_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["live_message_kind"]
          metadata?: Json | null
          session_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["live_message_kind"]
          metadata?: Json | null
          session_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_products: {
        Row: {
          created_at: string
          id: string
          is_spotlight: boolean
          live_price: number | null
          product_id: string
          session_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_spotlight?: boolean
          live_price?: number | null
          product_id: string
          session_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_spotlight?: boolean
          live_price?: number | null
          product_id?: string
          session_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_session_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_session_products_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          host_id: string | null
          host_name: string | null
          id: string
          scheduled_for: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["live_status"]
          stream_url: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          viewer_peak: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id?: string | null
          host_name?: string | null
          id?: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["live_status"]
          stream_url?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          viewer_peak?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id?: string | null
          host_name?: string | null
          id?: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["live_status"]
          stream_url?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          viewer_peak?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          category: string | null
          created_at: string
          emoji: string | null
          gradient: string | null
          id: string
          image: string | null
          name: string
          order_id: string
          price: number
          product_id: string | null
          quantity: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          emoji?: string | null
          gradient?: string | null
          id?: string
          image?: string | null
          name: string
          order_id: string
          price: number
          product_id?: string | null
          quantity: number
        }
        Update: {
          category?: string | null
          created_at?: string
          emoji?: string | null
          gradient?: string | null
          id?: string
          image?: string | null
          name?: string
          order_id?: string
          price?: number
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          approved_at: string | null
          assigned_at: string | null
          assigned_rider_id: string | null
          cancelled_at: string | null
          city: string
          created_at: string
          delivered_at: string | null
          delivery_distance_m: number | null
          delivery_duration_s: number | null
          delivery_fee: number
          dest_lat: number | null
          dest_lng: number | null
          full_name: string
          id: string
          notes: string | null
          order_number: string
          out_for_delivery_at: string | null
          packed_at: string | null
          payment_method: Database["public"]["Enums"]["order_payment_method"]
          phone: string
          picked_up_at: string | null
          pod_captured_at: string | null
          pod_notes: string | null
          pod_photo_url: string | null
          pod_recipient_name: string | null
          pod_signature_url: string | null
          processed_at: string | null
          rider_accepted_at: string | null
          rider_payout: number | null
          status: Database["public"]["Enums"]["order_status"]
          status_history: Json
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          approved_at?: string | null
          assigned_at?: string | null
          assigned_rider_id?: string | null
          cancelled_at?: string | null
          city: string
          created_at?: string
          delivered_at?: string | null
          delivery_distance_m?: number | null
          delivery_duration_s?: number | null
          delivery_fee?: number
          dest_lat?: number | null
          dest_lng?: number | null
          full_name: string
          id?: string
          notes?: string | null
          order_number: string
          out_for_delivery_at?: string | null
          packed_at?: string | null
          payment_method?: Database["public"]["Enums"]["order_payment_method"]
          phone: string
          picked_up_at?: string | null
          pod_captured_at?: string | null
          pod_notes?: string | null
          pod_photo_url?: string | null
          pod_recipient_name?: string | null
          pod_signature_url?: string | null
          processed_at?: string | null
          rider_accepted_at?: string | null
          rider_payout?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          status_history?: Json
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          approved_at?: string | null
          assigned_at?: string | null
          assigned_rider_id?: string | null
          cancelled_at?: string | null
          city?: string
          created_at?: string
          delivered_at?: string | null
          delivery_distance_m?: number | null
          delivery_duration_s?: number | null
          delivery_fee?: number
          dest_lat?: number | null
          dest_lng?: number | null
          full_name?: string
          id?: string
          notes?: string | null
          order_number?: string
          out_for_delivery_at?: string | null
          packed_at?: string | null
          payment_method?: Database["public"]["Enums"]["order_payment_method"]
          phone?: string
          picked_up_at?: string | null
          pod_captured_at?: string | null
          pod_notes?: string | null
          pod_photo_url?: string | null
          pod_recipient_name?: string | null
          pod_signature_url?: string | null
          processed_at?: string | null
          rider_accepted_at?: string | null
          rider_payout?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          status_history?: Json
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          storage_path: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          storage_path?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          credit_eligible: boolean
          description: string | null
          discount_price: number | null
          id: string
          is_active: boolean
          low_stock_threshold: number
          name: string
          price: number
          sku: string
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_eligible?: boolean
          description?: string | null
          discount_price?: number | null
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          name: string
          price: number
          sku: string
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_eligible?: boolean
          description?: string | null
          discount_price?: number | null
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          price?: number
          sku?: string
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          staff_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          staff_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          staff_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rider_locations: {
        Row: {
          created_at: string
          heading: number | null
          id: string
          lat: number
          lng: number
          order_id: string | null
          rider_id: string
          speed: number | null
        }
        Insert: {
          created_at?: string
          heading?: number | null
          id?: string
          lat: number
          lng: number
          order_id?: string | null
          rider_id: string
          speed?: number | null
        }
        Update: {
          created_at?: string
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          order_id?: string | null
          rider_id?: string
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rider_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_locations_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          created_at: string
          current_lat: number | null
          current_lng: number | null
          full_name: string
          id: string
          location_updated_at: string | null
          notes: string | null
          phone: string
          plate_number: string | null
          rating: number
          status: Database["public"]["Enums"]["rider_status"]
          total_deliveries: number
          updated_at: string
          user_id: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          zone: string | null
        }
        Insert: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name: string
          id?: string
          location_updated_at?: string | null
          notes?: string | null
          phone: string
          plate_number?: string | null
          rating?: number
          status?: Database["public"]["Enums"]["rider_status"]
          total_deliveries?: number
          updated_at?: string
          user_id?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          zone?: string | null
        }
        Update: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name?: string
          id?: string
          location_updated_at?: string | null
          notes?: string | null
          phone?: string
          plate_number?: string | null
          rating?: number
          status?: Database["public"]["Enums"]["rider_status"]
          total_deliveries?: number
          updated_at?: string
          user_id?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          zone?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_rider_for_my_order: {
        Args: { _order_id: string }
        Returns: {
          current_lat: number
          current_lng: number
          full_name: string
          id: string
          location_updated_at: string
          rating: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "store_owner"
        | "fleet_manager"
        | "credit_officer"
        | "rider"
        | "cooperative_member"
      credit_status:
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "repaying"
        | "completed"
      live_message_kind: "chat" | "system" | "purchase"
      live_status: "scheduled" | "live" | "ended"
      order_payment_method: "pay_now" | "credit"
      order_status:
        | "order_received"
        | "approved"
        | "processing"
        | "packed"
        | "assigned_rider"
        | "picked_up"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      rider_status: "available" | "on_delivery" | "off_duty" | "suspended"
      vehicle_type: "motorcycle" | "bicycle" | "car" | "van"
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
      app_role: [
        "super_admin",
        "store_owner",
        "fleet_manager",
        "credit_officer",
        "rider",
        "cooperative_member",
      ],
      credit_status: [
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "repaying",
        "completed",
      ],
      live_message_kind: ["chat", "system", "purchase"],
      live_status: ["scheduled", "live", "ended"],
      order_payment_method: ["pay_now", "credit"],
      order_status: [
        "order_received",
        "approved",
        "processing",
        "packed",
        "assigned_rider",
        "picked_up",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      rider_status: ["available", "on_delivery", "off_duty", "suspended"],
      vehicle_type: ["motorcycle", "bicycle", "car", "van"],
    },
  },
} as const
