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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      account_transfers: {
        Row: {
          amount: number
          converted_amount: number | null
          created_at: string
          description: string | null
          exchange_rate: number | null
          from_account_id: string
          from_currency: string | null
          id: string
          reference_number: string | null
          status: string | null
          to_account_id: string
          to_currency: string | null
          transfer_date: string
          user_id: string
        }
        Insert: {
          amount: number
          converted_amount?: number | null
          created_at?: string
          description?: string | null
          exchange_rate?: number | null
          from_account_id: string
          from_currency?: string | null
          id?: string
          reference_number?: string | null
          status?: string | null
          to_account_id: string
          to_currency?: string | null
          transfer_date?: string
          user_id: string
        }
        Update: {
          amount?: number
          converted_amount?: number | null
          created_at?: string
          description?: string | null
          exchange_rate?: number | null
          from_account_id?: string
          from_currency?: string | null
          id?: string
          reference_number?: string | null
          status?: string | null
          to_account_id?: string
          to_currency?: string | null
          transfer_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_number: string | null
          account_type: string | null
          bank_name: string | null
          budget_limit: number | null
          color: string
          created_at: string
          currency: string | null
          description: string | null
          id: string
          is_business: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          budget_limit?: number | null
          color?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_business?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          budget_limit?: number | null
          color?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_business?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          account_id: string | null
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          backup_type: string
          created_at: string
          error_message: string | null
          file_size: number | null
          file_url: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          backup_type: string
          created_at?: string
          error_message?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          status: string
          user_id: string
        }
        Update: {
          backup_type?: string
          created_at?: string
          error_message?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      business_categories: {
        Row: {
          account_code: string | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_system: boolean | null
          name: string
          parent_category_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_code?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          parent_category_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_code?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          parent_category_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          address: string | null
          company_name: string
          company_registration: string | null
          created_at: string
          email: string | null
          fiscal_year_start: string | null
          id: string
          industry: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name: string
          company_registration?: string | null
          created_at?: string
          email?: string | null
          fiscal_year_start?: string | null
          id?: string
          industry?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          company_registration?: string | null
          created_at?: string
          email?: string | null
          fiscal_year_start?: string | null
          id?: string
          industry?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          account_id: string | null
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          liability_id: string | null
          mime_type: string | null
          tags: string[] | null
          transaction_id: string | null
          uploaded_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          description?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          liability_id?: string | null
          mime_type?: string | null
          tags?: string[] | null
          transaction_id?: string | null
          uploaded_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          liability_id?: string | null
          mime_type?: string | null
          tags?: string[] | null
          transaction_id?: string | null
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_liability_id_fkey"
            columns: ["liability_id"]
            isOneToOne: false
            referencedRelation: "liabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      keywords: {
        Row: {
          category: string
          created_at: string
          id: string
          keyword: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          keyword: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          keyword?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      liabilities: {
        Row: {
          account_id: string
          billing_cycle_day: number | null
          created_at: string
          credit_limit: number | null
          creditor_name: string
          current_balance: number
          description: string | null
          due_date: string | null
          id: string
          interest_rate: number | null
          liability_type: string
          min_payment: number | null
          payment_amount: number | null
          payment_due_day: number | null
          payment_frequency: string | null
          principal_amount: number
          start_date: string
          statement_date: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          billing_cycle_day?: number | null
          created_at?: string
          credit_limit?: number | null
          creditor_name: string
          current_balance: number
          description?: string | null
          due_date?: string | null
          id?: string
          interest_rate?: number | null
          liability_type: string
          min_payment?: number | null
          payment_amount?: number | null
          payment_due_day?: number | null
          payment_frequency?: string | null
          principal_amount: number
          start_date: string
          statement_date?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          billing_cycle_day?: number | null
          created_at?: string
          credit_limit?: number | null
          creditor_name?: string
          current_balance?: number
          description?: string | null
          due_date?: string | null
          id?: string
          interest_rate?: number | null
          liability_type?: string
          min_payment?: number | null
          payment_amount?: number | null
          payment_due_day?: number | null
          payment_frequency?: string | null
          principal_amount?: number
          start_date?: string
          statement_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      liability_payments: {
        Row: {
          created_at: string
          id: string
          interest_paid: number
          liability_id: string
          notes: string | null
          payment_amount: number
          payment_date: string
          principal_paid: number
          remaining_balance: number
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_paid: number
          liability_id: string
          notes?: string | null
          payment_amount: number
          payment_date: string
          principal_paid: number
          remaining_balance: number
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_paid?: number
          liability_id?: string
          notes?: string | null
          payment_amount?: number
          payment_date?: string
          principal_paid?: number
          remaining_balance?: number
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liability_payments_liability_id_fkey"
            columns: ["liability_id"]
            isOneToOne: false
            referencedRelation: "liabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liability_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          bill_due_reminder: string | null
          budget_alerts: boolean | null
          created_at: string
          daily_reminder_time: string | null
          enable_email: boolean | null
          enable_notifications: boolean | null
          enable_push: boolean | null
          id: string
          low_balance_alerts: boolean | null
          low_balance_threshold: number | null
          notification_channel: string | null
          notify_on_expense: boolean | null
          notify_on_income: boolean | null
          recurring_reminders: boolean | null
          summary_frequency: string | null
          transaction_reminders: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_due_reminder?: string | null
          budget_alerts?: boolean | null
          created_at?: string
          daily_reminder_time?: string | null
          enable_email?: boolean | null
          enable_notifications?: boolean | null
          enable_push?: boolean | null
          id?: string
          low_balance_alerts?: boolean | null
          low_balance_threshold?: number | null
          notification_channel?: string | null
          notify_on_expense?: boolean | null
          notify_on_income?: boolean | null
          recurring_reminders?: boolean | null
          summary_frequency?: string | null
          transaction_reminders?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_due_reminder?: string | null
          budget_alerts?: boolean | null
          created_at?: string
          daily_reminder_time?: string | null
          enable_email?: boolean | null
          enable_notifications?: boolean | null
          enable_push?: boolean | null
          id?: string
          low_balance_alerts?: boolean | null
          low_balance_threshold?: number | null
          notification_channel?: string | null
          notify_on_expense?: boolean | null
          notify_on_income?: boolean | null
          recurring_reminders?: boolean | null
          summary_frequency?: string | null
          transaction_reminders?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications_history: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          account_id: string
          budget: number | null
          code: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          manager_name: string | null
          name: string
          start_date: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          budget?: number | null
          code?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          manager_name?: string | null
          name: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          budget?: number | null
          code?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          manager_name?: string | null
          name?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_transaction_executions: {
        Row: {
          amount: number
          created_at: string
          execution_date: string
          id: string
          notes: string | null
          recurring_transaction_id: string
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          execution_date?: string
          id?: string
          notes?: string | null
          recurring_transaction_id: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          execution_date?: string
          id?: string
          notes?: string | null
          recurring_transaction_id?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          account_id: string
          amount: number
          category: string
          created_at: string
          description: string | null
          frequency: string
          id: string
          is_active: boolean | null
          next_date: string
          priority: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category: string
          created_at?: string
          description?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          next_date: string
          priority: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          next_date?: string
          priority?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          business_category_id: string | null
          category: string
          created_at: string
          currency: string | null
          date: string
          description: string | null
          exchange_rate: number | null
          id: string
          is_recurring: boolean | null
          priority: number | null
          project_id: string | null
          reference_number: string | null
          tax_amount: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          business_category_id?: string | null
          category: string
          created_at?: string
          currency?: string | null
          date?: string
          description?: string | null
          exchange_rate?: number | null
          id?: string
          is_recurring?: boolean | null
          priority?: number | null
          project_id?: string | null
          reference_number?: string | null
          tax_amount?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          business_category_id?: string | null
          category?: string
          created_at?: string
          currency?: string | null
          date?: string
          description?: string | null
          exchange_rate?: number | null
          id?: string
          is_recurring?: boolean | null
          priority?: number | null
          project_id?: string | null
          reference_number?: string | null
          tax_amount?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_business_category_id_fkey"
            columns: ["business_category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          id: string
          permissions: Json | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          permissions?: Json | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          auto_backup_enabled: boolean | null
          avatar_url: string | null
          budget_alerts_enabled: boolean | null
          created_at: string
          dark_mode_enabled: boolean | null
          date_of_birth: string | null
          display_name: string | null
          email_notifications_enabled: boolean | null
          id: string
          language: string | null
          phone_number: string | null
          pin_enabled: boolean | null
          pin_hash: string | null
          primary_currency: string | null
          secondary_currency: string | null
          sms_notifications_enabled: boolean | null
          touch_id_enabled: boolean | null
          two_factor_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_backup_enabled?: boolean | null
          avatar_url?: string | null
          budget_alerts_enabled?: boolean | null
          created_at?: string
          dark_mode_enabled?: boolean | null
          date_of_birth?: string | null
          display_name?: string | null
          email_notifications_enabled?: boolean | null
          id?: string
          language?: string | null
          phone_number?: string | null
          pin_enabled?: boolean | null
          pin_hash?: string | null
          primary_currency?: string | null
          secondary_currency?: string | null
          sms_notifications_enabled?: boolean | null
          touch_id_enabled?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_backup_enabled?: boolean | null
          avatar_url?: string | null
          budget_alerts_enabled?: boolean | null
          created_at?: string
          dark_mode_enabled?: boolean | null
          date_of_birth?: string | null
          display_name?: string | null
          email_notifications_enabled?: boolean | null
          id?: string
          language?: string | null
          phone_number?: string | null
          pin_enabled?: boolean | null
          pin_hash?: string | null
          primary_currency?: string | null
          secondary_currency?: string | null
          sms_notifications_enabled?: boolean | null
          touch_id_enabled?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_account_admin: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
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
