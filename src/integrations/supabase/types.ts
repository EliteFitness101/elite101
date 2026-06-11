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
      bookings: {
        Row: {
          amount_ngn: number
          brand_id: string
          campaign_id: string
          commission_ngn: number
          created_at: string
          id: string
          model_id: string
          paystack_ref: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          amount_ngn: number
          brand_id: string
          campaign_id: string
          commission_ngn?: number
          created_at?: string
          id?: string
          model_id: string
          paystack_ref?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          amount_ngn?: number
          brand_id?: string
          campaign_id?: string
          commission_ngn?: number
          created_at?: string
          id?: string
          model_id?: string
          paystack_ref?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models_public"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          city: string | null
          created_at: string
          id: string
          industry: string | null
          logo_path: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_path?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_path?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          brand_id: string
          brief: string | null
          budget_ngn: number
          category: Database["public"]["Enums"]["model_category"] | null
          city: string | null
          created_at: string
          id: string
          shoot_date: string | null
          slots: number
          state: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          title: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          brief?: string | null
          budget_ngn?: number
          category?: Database["public"]["Enums"]["model_category"] | null
          city?: string | null
          created_at?: string
          id?: string
          shoot_date?: string | null
          slots?: number
          state?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          title: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          brief?: string | null
          budget_ngn?: number
          category?: Database["public"]["Enums"]["model_category"] | null
          city?: string | null
          created_at?: string
          id?: string
          shoot_date?: string | null
          slots?: number
          state?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          breakdown: Json | null
          campaign_id: string
          created_at: string
          id: string
          model_id: string
          total_score: number
        }
        Insert: {
          breakdown?: Json | null
          campaign_id: string
          created_at?: string
          id?: string
          model_id: string
          total_score?: number
        }
        Update: {
          breakdown?: Json | null
          campaign_id?: string
          created_at?: string
          id?: string
          model_id?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "matches_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models_public"
            referencedColumns: ["id"]
          },
        ]
      }
      model_photos: {
        Row: {
          created_at: string
          id: string
          model_id: string
          position: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          position?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          position?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_photos_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_photos_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models_public"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          age: number | null
          ai_improvements: string[] | null
          ai_reasoning: string | null
          ai_strengths: string[] | null
          bio: string | null
          category: Database["public"]["Enums"]["model_category"] | null
          city: string | null
          created_at: string
          full_name: string
          gender: string | null
          id: string
          ig_followers: number | null
          instagram: string | null
          phone: string | null
          score: number | null
          scored_at: string | null
          state: string | null
          status: Database["public"]["Enums"]["model_status"]
          tiktok: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          ai_improvements?: string[] | null
          ai_reasoning?: string | null
          ai_strengths?: string[] | null
          bio?: string | null
          category?: Database["public"]["Enums"]["model_category"] | null
          city?: string | null
          created_at?: string
          full_name: string
          gender?: string | null
          id?: string
          ig_followers?: number | null
          instagram?: string | null
          phone?: string | null
          score?: number | null
          scored_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["model_status"]
          tiktok?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          ai_improvements?: string[] | null
          ai_reasoning?: string | null
          ai_strengths?: string[] | null
          bio?: string | null
          category?: Database["public"]["Enums"]["model_category"] | null
          city?: string | null
          created_at?: string
          full_name?: string
          gender?: string | null
          id?: string
          ig_followers?: number | null
          instagram?: string | null
          phone?: string | null
          score?: number | null
          scored_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["model_status"]
          tiktok?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
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
      models_public: {
        Row: {
          age: number | null
          bio: string | null
          category: Database["public"]["Enums"]["model_category"] | null
          city: string | null
          created_at: string | null
          full_name: string | null
          gender: string | null
          id: string | null
          ig_followers: number | null
          instagram: string | null
          score: number | null
          state: string | null
          status: Database["public"]["Enums"]["model_status"] | null
          tiktok: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          age?: number | null
          bio?: string | null
          category?: Database["public"]["Enums"]["model_category"] | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string | null
          ig_followers?: number | null
          instagram?: string | null
          score?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["model_status"] | null
          tiktok?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          age?: number | null
          bio?: string | null
          category?: Database["public"]["Enums"]["model_category"] | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string | null
          ig_followers?: number | null
          instagram?: string | null
          score?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["model_status"] | null
          tiktok?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "model" | "brand" | "admin"
      booking_status:
        | "pending"
        | "paid"
        | "accepted"
        | "completed"
        | "cancelled"
      campaign_status: "draft" | "open" | "closed" | "completed"
      model_category: "Platinum" | "Commercial" | "Influencer" | "Training"
      model_status: "pending" | "approved" | "rejected"
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
      app_role: ["model", "brand", "admin"],
      booking_status: ["pending", "paid", "accepted", "completed", "cancelled"],
      campaign_status: ["draft", "open", "closed", "completed"],
      model_category: ["Platinum", "Commercial", "Influencer", "Training"],
      model_status: ["pending", "approved", "rejected"],
    },
  },
} as const
