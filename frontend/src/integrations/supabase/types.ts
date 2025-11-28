export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      brand_cache: {
        Row: {
          id: string
          brand_code: string
          brand_name: string
          slug: string
          category: string | null
          discount: number | null
          denomination_list: string | null
          brand_type: string | null
          stock_available: number | null
          is_active: boolean | null
          description: string | null
          terms_conditions: string | null
          images: Json | null
          last_fetched_at: string | null
          cache_expires_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          brand_code: string
          brand_name: string
          slug: string
          category?: string | null
          discount?: number | null
          denomination_list?: string | null
          brand_type?: string | null
          stock_available?: number | null
          is_active?: boolean | null
          description?: string | null
          terms_conditions?: string | null
          images?: Json | null
          last_fetched_at?: string | null
          cache_expires_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          brand_code?: string
          brand_name?: string
          slug?: string
          category?: string | null
          discount?: number | null
          denomination_list?: string | null
          brand_type?: string | null
          stock_available?: number | null
          is_active?: boolean | null
          description?: string | null
          terms_conditions?: string | null
          images?: Json | null
          last_fetched_at?: string | null
          cache_expires_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voucher_categories: {
        Row: {
          id: string
          category_name: string
          category_slug: string
          icon: string | null
          display_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          category_name: string
          category_slug: string
          icon?: string | null
          display_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          category_name?: string
          category_slug?: string
          icon?: string | null
          display_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      merchant_sync: {
        Row: {
          id: string
          merchant_id: string
          user_id: string
          business_name: string
          email: string
          mobile_number: string | null
          is_approved: boolean | null
          approved_at: string | null
          last_synced_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          merchant_id: string
          user_id: string
          business_name: string
          email: string
          mobile_number?: string | null
          is_approved?: boolean | null
          approved_at?: string | null
          last_synced_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          merchant_id?: string
          user_id?: string
          business_name?: string
          email?: string
          mobile_number?: string | null
          is_approved?: boolean | null
          approved_at?: string | null
          last_synced_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voucher_orders: {
        Row: {
          id: string
          order_id: string
          merchant_id: string
          user_id: string
          brand_code: string
          brand_name: string
          sku_code: string
          quantity: number
          amount_per_voucher: number
          total_amount: number
          currency: string | null
          recipient_first_name: string
          recipient_last_name: string
          recipient_mobile: string
          recipient_email: string
          recipient_address: string | null
          recipient_city: string | null
          recipient_state: string | null
          recipient_pincode: string | null
          order_status: string
          vd_request_ref_no: string | null
          vd_response: Json | null
          error_code: string | null
          error_message: string | null
          created_at: string | null
          updated_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          merchant_id: string
          user_id: string
          brand_code: string
          brand_name: string
          sku_code: string
          quantity: number
          amount_per_voucher: number
          total_amount: number
          currency?: string | null
          recipient_first_name: string
          recipient_last_name: string
          recipient_mobile: string
          recipient_email: string
          recipient_address?: string | null
          recipient_city?: string | null
          recipient_state?: string | null
          recipient_pincode?: string | null
          order_status?: string
          vd_request_ref_no?: string | null
          vd_response?: Json | null
          error_code?: string | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          merchant_id?: string
          user_id?: string
          brand_code?: string
          brand_name?: string
          sku_code?: string
          quantity?: number
          amount_per_voucher?: number
          total_amount?: number
          currency?: string | null
          recipient_first_name?: string
          recipient_last_name?: string
          recipient_mobile?: string
          recipient_email?: string
          recipient_address?: string | null
          recipient_city?: string | null
          recipient_state?: string | null
          recipient_pincode?: string | null
          order_status?: string
          vd_request_ref_no?: string | null
          vd_response?: Json | null
          error_code?: string | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
        }
        Relationships: []
      }
      voucher_items: {
        Row: {
          id: string
          order_id: string
          merchant_id: string
          card_number: string
          card_pin: string
          card_status: string
          balance_basic: number
          balance_bonus: number | null
          balance_total: number
          bonus_given: number | null
          deal_no: string | null
          expiry_date: string
          activation_url: string | null
          is_redeemed: boolean | null
          redeemed_at: string | null
          redeemed_amount: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          merchant_id: string
          card_number: string
          card_pin: string
          card_status?: string
          balance_basic: number
          balance_bonus?: number | null
          balance_total: number
          bonus_given?: number | null
          deal_no?: string | null
          expiry_date: string
          activation_url?: string | null
          is_redeemed?: boolean | null
          redeemed_at?: string | null
          redeemed_amount?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          merchant_id?: string
          card_number?: string
          card_pin?: string
          card_status?: string
          balance_basic?: number
          balance_bonus?: number | null
          balance_total?: number
          bonus_given?: number | null
          deal_no?: string | null
          expiry_date?: string
          activation_url?: string | null
          is_redeemed?: boolean | null
          redeemed_at?: string | null
          redeemed_amount?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wallet_balance: {
        Row: {
          id: string
          wallet_type: string
          available_balance: number
          reserved_balance: number
          total_balance: number | null
          currency: string | null
          last_synced_balance: number | null
          last_synced_at: string | null
          sync_status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          wallet_type?: string
          available_balance?: number
          reserved_balance?: number
          total_balance?: number | null
          currency?: string | null
          last_synced_balance?: number | null
          last_synced_at?: string | null
          sync_status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          wallet_type?: string
          available_balance?: number
          reserved_balance?: number
          total_balance?: number | null
          currency?: string | null
          last_synced_balance?: number | null
          last_synced_at?: string | null
          sync_status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          id: string
          transaction_type: string
          amount: number
          balance_before: number
          balance_after: number
          order_id: string | null
          merchant_id: string | null
          description: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          transaction_type: string
          amount: number
          balance_before: number
          balance_after: number
          order_id?: string | null
          merchant_id?: string | null
          description?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          transaction_type?: string
          amount?: number
          balance_before?: number
          balance_after?: number
          order_id?: string | null
          merchant_id?: string | null
          description?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      valuedesign_transactions: {
        Row: {
          id: string
          api_endpoint: string
          http_method: string
          request_payload: Json | null
          request_headers: Json | null
          response_status: number | null
          response_payload: Json | null
          response_time_ms: number | null
          order_id: string | null
          merchant_id: string | null
          is_success: boolean | null
          error_code: string | null
          error_message: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          api_endpoint: string
          http_method: string
          request_payload?: Json | null
          request_headers?: Json | null
          response_status?: number | null
          response_payload?: Json | null
          response_time_ms?: number | null
          order_id?: string | null
          merchant_id?: string | null
          is_success?: boolean | null
          error_code?: string | null
          error_message?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          api_endpoint?: string
          http_method?: string
          request_payload?: Json | null
          request_headers?: Json | null
          response_status?: number | null
          response_payload?: Json | null
          response_time_ms?: number | null
          order_id?: string | null
          merchant_id?: string | null
          is_success?: boolean | null
          error_code?: string | null
          error_message?: string | null
          created_at?: string | null
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

export type Tables<T extends keyof Database['vouchers']['Tables']> = 
  Database['vouchers']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['vouchers']['Tables']> = 
  Database['vouchers']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['vouchers']['Tables']> = 
  Database['vouchers']['Tables'][T]['Update']