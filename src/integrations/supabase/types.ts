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
      announcements: {
        Row: {
          content: string
          created_at: string
          excerpt: string | null
          id: string
          pinned: boolean
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          pinned?: boolean
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          pinned?: boolean
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          conversation_type: string
          created_at: string | null
          id: string
          last_message_at: string | null
          reference_id: string | null
          staff_user_id: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          conversation_type: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          reference_id?: string | null
          staff_user_id?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          conversation_type?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          reference_id?: string | null
          staff_user_id?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          is_staff: boolean | null
          message: string
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_staff?: boolean | null
          message: string
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_staff?: boolean | null
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          notes: string | null
          participant_email: string
          participant_name: string
          party_size: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          notes?: string | null
          participant_email: string
          participant_name: string
          party_size?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          participant_email?: string
          participant_name?: string
          party_size?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      events_programs: {
        Row: {
          category: string | null
          created_at: string | null
          current_participants: number | null
          description: string
          duration_minutes: number | null
          end_time: string | null
          event_date: string
          id: string
          image_url: string | null
          instructor: string | null
          is_active: boolean | null
          location: string | null
          max_participants: number | null
          price: number | null
          requirements: string[] | null
          start_time: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          current_participants?: number | null
          description: string
          duration_minutes?: number | null
          end_time?: string | null
          event_date: string
          id?: string
          image_url?: string | null
          instructor?: string | null
          is_active?: boolean | null
          location?: string | null
          max_participants?: number | null
          price?: number | null
          requirements?: string[] | null
          start_time: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          current_participants?: number | null
          description?: string
          duration_minutes?: number | null
          end_time?: string | null
          event_date?: string
          id?: string
          image_url?: string | null
          instructor?: string | null
          is_active?: boolean | null
          location?: string | null
          max_participants?: number | null
          price?: number | null
          requirements?: string[] | null
          start_time?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          caption: string | null
          comment_count: number
          created_at: string
          id: string
          like_count: number | null
          url: string
          user_id: string
          visibility: string
        }
        Insert: {
          caption?: string | null
          comment_count?: number
          created_at?: string
          id?: string
          like_count?: number | null
          url: string
          user_id: string
          visibility?: string
        }
        Update: {
          caption?: string | null
          comment_count?: number
          created_at?: string
          id?: string
          like_count?: number | null
          url?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      guides: {
        Row: {
          age_rating: string | null
          category: string | null
          created_at: string | null
          duration_minutes: number | null
          game_name: string
          how_to_play: string
          id: string
          intensity_level: string | null
          is_published: boolean | null
          media_urls: string[] | null
          overview: string
          qr_code_data: string | null
          setup_instructions: string
          tags: string[] | null
          tips_and_scoring: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          age_rating?: string | null
          category?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          game_name: string
          how_to_play: string
          id?: string
          intensity_level?: string | null
          is_published?: boolean | null
          media_urls?: string[] | null
          overview: string
          qr_code_data?: string | null
          setup_instructions: string
          tags?: string[] | null
          tips_and_scoring?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          age_rating?: string | null
          category?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          game_name?: string
          how_to_play?: string
          id?: string
          intensity_level?: string | null
          is_published?: boolean | null
          media_urls?: string[] | null
          overview?: string
          qr_code_data?: string | null
          setup_instructions?: string
          tags?: string[] | null
          tips_and_scoring?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      party_requests: {
        Row: {
          age: number | null
          contact_email: string
          contact_phone: string
          created_at: string | null
          estimated_cost: number | null
          guest_count: number
          id: string
          name: string
          party_type: string
          preferred_date: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          school_name: string | null
          special_notes: string | null
          staff_notes: string | null
          status: string | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          age?: number | null
          contact_email: string
          contact_phone: string
          created_at?: string | null
          estimated_cost?: number | null
          guest_count: number
          id?: string
          name: string
          party_type: string
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          school_name?: string | null
          special_notes?: string | null
          staff_notes?: string | null
          status?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          age?: number | null
          contact_email?: string
          contact_phone?: string
          created_at?: string | null
          estimated_cost?: number | null
          guest_count?: number
          id?: string
          name?: string
          party_type?: string
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          school_name?: string | null
          special_notes?: string | null
          staff_notes?: string | null
          status?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_requests_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      photo_comments: {
        Row: {
          created_at: string
          id: string
          photo_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_comments_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "gallery_items"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_likes: {
        Row: {
          created_at: string
          id: string
          photo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_likes_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "gallery_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string | null
          created_at: string
          full_name: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_color?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_bookings: {
        Row: {
          booking_date: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          duration_hours: number
          end_time: string
          id: string
          notes: string | null
          room_id: string
          start_time: string
          status: string | null
          total_amount: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_date: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          duration_hours: number
          end_time: string
          id?: string
          notes?: string | null
          room_id: string
          start_time: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_date?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          duration_hours?: number
          end_time?: string
          id?: string
          notes?: string | null
          room_id?: string
          start_time?: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_bookings_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rooms: {
        Row: {
          amenities: string[] | null
          capacity: number
          created_at: string | null
          description: string | null
          hourly_rate: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          type: string
        }
        Insert: {
          amenities?: string[] | null
          capacity: number
          created_at?: string | null
          description?: string | null
          hourly_rate?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          type: string
        }
        Update: {
          amenities?: string[] | null
          capacity?: number
          created_at?: string | null
          description?: string | null
          hourly_rate?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      snacks: {
        Row: {
          available: boolean | null
          category: string
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          available?: boolean | null
          category: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          available?: boolean | null
          category?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_accounts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          password_hash: string
          role: Database["public"]["Enums"]["app_role"]
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          password_hash: string
          role: Database["public"]["Enums"]["app_role"]
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          password_hash?: string
          role?: Database["public"]["Enums"]["app_role"]
          username?: string
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
      create_staff_user_with_role: {
        Args: {
          user_email: string
          user_name: string
          user_password: string
          user_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff_with_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "customer"
        | "support"
        | "booking"
        | "gallery_moderator"
        | "events_programs"
        | "announcements"
        | "snacks"
        | "gallery"
        | "guides"
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
        "customer",
        "support",
        "booking",
        "gallery_moderator",
        "events_programs",
        "announcements",
        "snacks",
        "gallery",
        "guides",
      ],
    },
  },
} as const
