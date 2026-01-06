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
      clients: {
        Row: {
          active: boolean | null
          address: string | null
          city: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          id: string
          institution_name: string
          name: string
          phone: string
          pincode: string | null
          state: string | null
          updated_at: string
          user_id: string | null
          vendor_id: string
          wallet_balance: number | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          institution_name: string
          name: string
          phone: string
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
          vendor_id: string
          wallet_balance?: number | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          institution_name?: string
          name?: string
          phone?: string
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
          vendor_id?: string
          wallet_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          client_id: string
          created_at: string
          description: string
          id: string
          priority: string | null
          project_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description: string
          id?: string
          priority?: string | null
          project_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string | null
          project_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_masks: {
        Row: {
          created_at: string
          id: string
          is_public: boolean | null
          mask_url: string
          name: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean | null
          mask_url: string
          name: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean | null
          mask_url?: string
          name?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_masks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      data_records: {
        Row: {
          background_removed: boolean | null
          created_at: string
          cropped_photo_url: string | null
          data_json: Json
          face_crop_coordinates: Json | null
          face_detected: boolean | null
          group_id: string | null
          id: string
          original_photo_url: string | null
          photo_url: string | null
          processing_error: string | null
          processing_status: string | null
          project_id: string
          record_number: number
          updated_at: string
        }
        Insert: {
          background_removed?: boolean | null
          created_at?: string
          cropped_photo_url?: string | null
          data_json: Json
          face_crop_coordinates?: Json | null
          face_detected?: boolean | null
          group_id?: string | null
          id?: string
          original_photo_url?: string | null
          photo_url?: string | null
          processing_error?: string | null
          processing_status?: string | null
          project_id: string
          record_number: number
          updated_at?: string
        }
        Update: {
          background_removed?: boolean | null
          created_at?: string
          cropped_photo_url?: string | null
          data_json?: Json
          face_crop_coordinates?: Json | null
          face_detected?: boolean | null
          group_id?: string | null
          id?: string
          original_photo_url?: string | null
          photo_url?: string | null
          processing_error?: string | null
          processing_status?: string | null
          project_id?: string
          record_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_records_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "project_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      library_fonts: {
        Row: {
          created_at: string
          font_url: string
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          font_url: string
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          font_url?: string
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_fonts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      library_icons: {
        Row: {
          category: string | null
          created_at: string
          icon_url: string
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          icon_url: string
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          icon_url?: string
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_icons_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      library_shapes: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_public: boolean | null
          name: string
          shape_url: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          name: string
          shape_url: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          name?: string
          shape_url?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_shapes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          id: string
          notes: string | null
          payment_method: string
          project_id: string | null
          receipt_url: string | null
          recorded_by: string | null
          transaction_id: string | null
          vendor_id: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method: string
          project_id?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          transaction_id?: string | null
          vendor_id: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          project_id?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          transaction_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          base_price: number
          category: string
          created_at: string
          default_height_mm: number | null
          default_width_mm: number | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          base_price: number
          category: string
          created_at?: string
          default_height_mm?: number | null
          default_width_mm?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          base_price?: number
          category?: string
          created_at?: string
          default_height_mm?: number | null
          default_width_mm?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          record_count: number | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          record_count?: number | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          record_count?: number | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_groups_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          status: string | null
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          status?: string | null
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          status?: string | null
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_delivery_date: string | null
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          expected_delivery_date: string | null
          id: string
          name: string
          notes: string | null
          paid_amount: number | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          product_id: string | null
          project_number: string
          quantity: number
          sales_person_id: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          total_amount: number | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          actual_delivery_date?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          expected_delivery_date?: string | null
          id?: string
          name: string
          notes?: string | null
          paid_amount?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          product_id?: string | null
          project_number: string
          quantity?: number
          sales_person_id?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          total_amount?: number | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          actual_delivery_date?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          expected_delivery_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          paid_amount?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          product_id?: string | null
          project_number?: string
          quantity?: number
          sales_person_id?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          total_amount?: number | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_data_links: {
        Row: {
          created_at: string
          created_by: string
          current_submissions: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_submissions: number
          project_id: string | null
          teacher_email: string | null
          teacher_name: string
          teacher_phone: string | null
          token: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_submissions?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_submissions?: number
          project_id?: string | null
          teacher_email?: string | null
          teacher_name: string
          teacher_phone?: string | null
          token: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_submissions?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_submissions?: number
          project_id?: string | null
          teacher_email?: string | null
          teacher_name?: string
          teacher_phone?: string | null
          token?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_data_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_data_links_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_submissions: {
        Row: {
          additional_data: Json | null
          address: string | null
          blood_group: string | null
          dob: string | null
          id: string
          link_id: string
          parent_name: string | null
          phone: string | null
          roll_no: string | null
          student_class: string | null
          student_name: string
          student_photo_url: string | null
          submitted_at: string
        }
        Insert: {
          additional_data?: Json | null
          address?: string | null
          blood_group?: string | null
          dob?: string | null
          id?: string
          link_id: string
          parent_name?: string | null
          phone?: string | null
          roll_no?: string | null
          student_class?: string | null
          student_name: string
          student_photo_url?: string | null
          submitted_at?: string
        }
        Update: {
          additional_data?: Json | null
          address?: string | null
          blood_group?: string | null
          dob?: string | null
          id?: string
          link_id?: string
          parent_name?: string | null
          phone?: string | null
          roll_no?: string | null
          student_class?: string | null
          student_name?: string
          student_photo_url?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_submissions_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "teacher_data_links"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          back_design_json: Json | null
          category: string
          created_at: string
          design_json: Json
          has_back_side: boolean | null
          height_mm: number
          id: string
          is_public: boolean | null
          name: string
          product_id: string | null
          thumbnail_url: string | null
          updated_at: string
          vendor_id: string | null
          width_mm: number
        }
        Insert: {
          back_design_json?: Json | null
          category: string
          created_at?: string
          design_json: Json
          has_back_side?: boolean | null
          height_mm: number
          id?: string
          is_public?: boolean | null
          name: string
          product_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          vendor_id?: string | null
          width_mm: number
        }
        Update: {
          back_design_json?: Json | null
          category?: string
          created_at?: string
          design_json?: Json
          has_back_side?: boolean | null
          height_mm?: number
          id?: string
          is_public?: boolean | null
          name?: string
          product_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          vendor_id?: string | null
          width_mm?: number
        }
        Relationships: [
          {
            foreignKeyName: "templates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
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
      vendor_pricing: {
        Row: {
          created_at: string
          id: string
          min_quantity: number | null
          price: number
          product_id: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_quantity?: number | null
          price: number
          product_id: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          min_quantity?: number | null
          price?: number
          product_id?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_pricing_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_staff: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_staff_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          active: boolean | null
          address: string | null
          business_name: string
          city: string | null
          commission_percentage: number | null
          created_at: string
          credit_limit: number | null
          gstin: string | null
          id: string
          is_master: boolean | null
          parent_vendor_id: string | null
          pincode: string | null
          state: string | null
          updated_at: string
          user_id: string
          wallet_balance: number | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          business_name: string
          city?: string | null
          commission_percentage?: number | null
          created_at?: string
          credit_limit?: number | null
          gstin?: string | null
          id?: string
          is_master?: boolean | null
          parent_vendor_id?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          wallet_balance?: number | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          business_name?: string
          city?: string | null
          commission_percentage?: number | null
          created_at?: string
          credit_limit?: number | null
          gstin?: string | null
          id?: string
          is_master?: boolean | null
          parent_vendor_id?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          wallet_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_parent_vendor_id_fkey"
            columns: ["parent_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          reference_id: string | null
          transaction_type: string
          vendor_id: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master_vendor_of: {
        Args: { check_vendor_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "master_vendor"
        | "vendor_staff"
        | "designer_staff"
        | "data_operator"
        | "sales_person"
        | "accounts_manager"
        | "production_manager"
        | "client"
      payment_status: "pending" | "partial" | "completed" | "refunded"
      project_status:
        | "draft"
        | "data_upload"
        | "design"
        | "proof_ready"
        | "approved"
        | "printing"
        | "dispatched"
        | "delivered"
        | "cancelled"
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
        "master_vendor",
        "vendor_staff",
        "designer_staff",
        "data_operator",
        "sales_person",
        "accounts_manager",
        "production_manager",
        "client",
      ],
      payment_status: ["pending", "partial", "completed", "refunded"],
      project_status: [
        "draft",
        "data_upload",
        "design",
        "proof_ready",
        "approved",
        "printing",
        "dispatched",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
