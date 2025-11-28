export interface User {
  id: string;
  email: string;
  created_at: string;
}

export enum UserRole {
  ADMIN = 'admin',
  DISTRIBUTOR = 'distributor',
  MERCHANT = 'merchant',
  CUSTOMER = 'customer',
  GUEST = 'guest',
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface MerchantProfile {
  id: string;
  user_id: string;
  full_name: string;
  mobile_number: string;
  email: string;
  pan_number?: string;
  aadhaar_number?: string;
  business_name?: string;
  gst_number?: string;
  onboarding_status: OnboardingStatus;
  distributor_id?: string;
  entity_type?: string;
  risk_level?: string;
  application_id?: string;
  upi_vpa?: string;
  upi_qr_string?: string;
  created_at: string;
  updated_at: string;
}

export enum OnboardingStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface MerchantSync {
  id: string;
  merchant_id: string;
  user_id: string;
  business_name: string;
  email: string;
  mobile_number?: string;
  is_approved: boolean;
  approved_at?: string;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface BrandCache {
  id: string;
  brand_code: string;
  brand_name: string;
  category?: string;
  discount?: number;
  denomination_list?: string;
  brand_type?: string;
  stock_available?: number;
  is_active: boolean;
  description?: string;
  terms_conditions?: string;
  images?: Record<string, unknown>;
  last_fetched_at: string;
  cache_expires_at?: string;
  category_id?: string;
  slug?: string;
  created_at: string;
  updated_at: string;
}

export interface VoucherCategory {
  id: string;
  category_name: string;
  category_slug: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface VoucherOrder {
  id: string;
  order_id: string; // Unique order identifier
  merchant_id: string;
  user_id: string;
  brand_code: string;
  brand_name: string;
  sku_code: string;
  quantity: number;
  amount_per_voucher: number;
  total_amount: number;
  currency: string;
  recipient_first_name: string;
  recipient_last_name: string;
  recipient_mobile: string;
  recipient_email: string;
  recipient_address?: string;
  recipient_city?: string;
  recipient_state?: string;
  recipient_pincode?: string;
  order_status: OrderStatus;
  vd_request_ref_no?: string;
  vd_response?: Record<string, unknown>;
  error_code?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export interface VoucherItem {
  id: string;
  order_id: string;
  merchant_id: string;
  card_number: string;
  card_pin: string;
  card_status: CardStatus;
  balance_basic: number;
  balance_bonus?: number;
  balance_total: number;
  bonus_given?: number;
  deal_no?: string;
  expiry_date: string;
  activation_url?: string;
  is_redeemed: boolean;
  redeemed_at?: string;
  redeemed_amount?: number;
  created_at: string;
  updated_at: string;
}

export enum CardStatus {
  ACTIVE = 'active',
  REDEEMED = 'redeemed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface WalletBalance {
  id: string;
  wallet_type: string;
  available_balance: number;
  reserved_balance: number;
  total_balance: number;
  currency: string;
  last_synced_balance?: number;
  last_synced_at?: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export enum SyncStatus {
  SYNCED = 'synced',
  OUT_OF_SYNC = 'out_of_sync',
  ERROR = 'error',
}

export interface WalletTransaction {
  id: string;
  transaction_type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  order_id?: string;
  merchant_id?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export enum TransactionType {
  TOPUP = 'topup',
  DEBIT = 'debit',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
  RESERVE = 'reserve',
  RELEASE = 'release',
}

export interface ValueDesignTransaction {
  id: string;
  api_endpoint: string;
  http_method: string;
  request_payload?: Record<string, unknown>;
  request_headers?: Record<string, unknown>;
  response_status?: number;
  response_payload?: Record<string, unknown>;
  response_time_ms?: number;
  order_id?: string;
  merchant_id?: string;
  is_success: boolean;
  error_code?: string;
  error_message?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  read: boolean;
  read_at?: string;
  created_at: string;
}

export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}
