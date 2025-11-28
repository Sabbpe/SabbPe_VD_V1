"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderService = exports.OrderService = void 0;
const supabase_1 = require("../../config/supabase");
const valuedesign_service_1 = require("../../services/valuedesign.service");
const brand_sync_service_1 = require("../../services/brand-sync.service");
const wallet_service_1 = require("../../services/wallet.service");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const database_1 = require("../../types/database");
const uuid_1 = require("uuid");
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ORDER SERVICE CLASS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class OrderService {
    /**
     * Get brand details from cache
     */
    async getBrandDetails(brandCode) {
        try {
            logger_1.logger.info('Fetching brand details from cache', { brandCode });
            const brand = await brand_sync_service_1.brandSyncService.getBrandByCode(brandCode);
            if (!brand) {
                throw new errors_1.NotFoundError(`Brand '${brandCode}' not found in cache. Please sync brands first using POST /api/brands/sync`);
            }
            logger_1.logger.info('✓ Brand found in cache', {
                brandCode,
                brandName: brand.brand_name,
                category: brand.category,
            });
            return brand;
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch brand details', {
                brandCode,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Create new order with complete flow
     */
    async createOrder(data) {
        const contextId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
            logger_1.logger.info('════════════════════════════════════════════════════════════════');
            logger_1.logger.info(`[${contextId}] 📦 Creating new order`);
            logger_1.logger.info('════════════════════════════════════════════════════════════════');
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STEP 1: Validate Request
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            logger_1.logger.info(`[${contextId}] Step 1/7: Validating request...`);
            if (!data.brandCode || data.brandCode.trim() === '') {
                throw new errors_1.ValidationError('Brand code is required');
            }
            if (data.quantity <= 0) {
                throw new errors_1.ValidationError('Quantity must be greater than 0');
            }
            if (data.amountPerVoucher <= 0) {
                throw new errors_1.ValidationError('Amount per voucher must be greater than 0');
            }
            if (!data.recipientEmail || !data.recipientMobile) {
                throw new errors_1.ValidationError('Recipient email and mobile are required');
            }
            logger_1.logger.info(`[${contextId}] ✓ Request validation passed`);
            const totalAmount = data.quantity * data.amountPerVoucher;
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STEP 2: Get Brand Details from Cache
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            logger_1.logger.info(`[${contextId}] Step 2/7: Fetching brand details from cache...`);
            const brand = await this.getBrandDetails(data.brandCode);
            logger_1.logger.info(`[${contextId}] ✓ Brand details fetched`, {
                brandCode: brand.brand_code,
                brandName: brand.brand_name,
                category: brand.category,
            });
            // Validate denomination if available
            if (brand.denomination_list && brand.denomination_list.trim() !== '') {
                const validDenominations = brand.denomination_list
                    .split(',')
                    .map((d) => parseFloat(d.trim()))
                    .filter((d) => !isNaN(d));
                if (validDenominations.length > 0 &&
                    !validDenominations.includes(data.amountPerVoucher)) {
                    throw new errors_1.ValidationError(`Invalid denomination. Valid denominations for ${brand.brand_name}: ${brand.denomination_list}`);
                }
            }
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STEP 3: Check Wallet Balance
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            logger_1.logger.info(`[${contextId}] Step 3/7: Checking wallet balance...`);
            const wallet = await wallet_service_1.walletService.getWalletBalance(data.userId);
            const currentBalance = wallet.balance;
            if (currentBalance < totalAmount) {
                throw new errors_1.ValidationError(`Insufficient wallet balance. Required: ₹${totalAmount}, Available: ₹${currentBalance}`);
            }
            logger_1.logger.info(`[${contextId}] ✓ Wallet balance sufficient`, {
                required: totalAmount,
                available: currentBalance,
            });
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STEP 4: Create Order Record
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            logger_1.logger.info(`[${contextId}] Step 4/7: Creating order record...`);
            const orderId = `ORD-${Date.now()}-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
            const receiptNo = `RCP-${Date.now()}`;
            const reqId = `REQ-${Date.now()}`;
            const { data: order, error: orderError } = await supabase_1.supabase
                .from('voucher_orders')
                .insert([
                {
                    order_id: orderId,
                    user_id: data.userId,
                    merchant_id: data.merchantId || null,
                    brand_code: data.brandCode,
                    brand_name: brand.brand_name,
                    sku_code: data.brandCode,
                    quantity: data.quantity,
                    amount_per_voucher: data.amountPerVoucher,
                    total_amount: totalAmount,
                    currency: 'INR',
                    recipient_first_name: data.recipientFirstName || 'Customer',
                    recipient_last_name: data.recipientLastName || 'Name',
                    recipient_mobile: data.recipientMobile,
                    recipient_email: data.recipientEmail,
                    recipient_address: data.recipientAddress || null,
                    recipient_city: data.recipientCity || null,
                    recipient_state: data.recipientState || null,
                    recipient_pincode: data.recipientPincode || null,
                    order_status: database_1.OrderStatus.PENDING,
                },
            ])
                .select()
                .single();
            if (orderError || !order) {
                throw new Error(`Failed to create order: ${orderError?.message || 'Unknown error'}`);
            }
            logger_1.logger.info(`[${contextId}] ✓ Order record created`, {
                orderId,
                dbId: order.id,
            });
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STEP 5: Purchase Vouchers from ValueDesign
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            logger_1.logger.info(`[${contextId}] Step 5/7: Purchasing vouchers from ValueDesign...`);
            // Update order status to processing
            await this.updateOrderStatus(order.id, database_1.OrderStatus.PROCESSING);
            try {
                const vdResponse = await valuedesign_service_1.valueDesignService.getEVCs({
                    orderId: orderId,
                    skuCode: data.brandCode,
                    noOfCard: data.quantity,
                    amount: data.amountPerVoucher.toString(),
                    receiptNo: receiptNo,
                    reqId: reqId,
                    firstName: data.recipientFirstName || 'Customer',
                    lastName: data.recipientLastName || 'Name',
                    mobileNo: data.recipientMobile,
                    email: data.recipientEmail,
                    address: data.recipientAddress || '',
                    city: data.recipientCity || '',
                    state: data.recipientState || '',
                    pincode: data.recipientPincode || '',
                    country: 'India',
                });
                logger_1.logger.info(`[${contextId}] ✓ ValueDesign response received`, {
                    orderId,
                    vdOrderId: vdResponse.order_id,
                    refNo: vdResponse.request_ref_no,
                    resultCode: vdResponse.resultCode,
                });
                // Check if ValueDesign call was successful
                if (vdResponse.resultCode !== '0' && vdResponse.resultCode !== 0) {
                    throw new Error(`ValueDesign API error: ${vdResponse.getMarketingMessage || 'Unknown error'}`);
                }
                // Store VD response
                await this.storeValueDesignResponse(order.id, vdResponse.request_ref_no || reqId, vdResponse);
                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                // STEP 6: Store Voucher Items
                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                logger_1.logger.info(`[${contextId}] Step 6/7: Storing voucher items...`);
                if (vdResponse.brand_details && vdResponse.brand_details.length > 0) {
                    const brandDetail = vdResponse.brand_details[0];
                    if (brandDetail.items && brandDetail.items.length > 0) {
                        const voucherItems = brandDetail.items.map((item) => ({
                            card_number: item.getCardNo,
                            card_pin: item.getCardPin,
                            card_status: item.getCardStatus || 'active',
                            balance_basic: parseFloat(item.balanceBasic) || 0,
                            balance_bonus: parseFloat(item.balanceBonus) || 0,
                            balance_total: parseFloat(item.balanceTotal) || 0,
                            expiry_date: item.getExpiryDate || null,
                        }));
                        await this.addVoucherItems(order.id, data.merchantId || '', voucherItems);
                        logger_1.logger.info(`[${contextId}] ✓ Voucher items stored`, {
                            count: voucherItems.length,
                        });
                    }
                    else {
                        logger_1.logger.warn(`[${contextId}] ⚠️ No voucher items in ValueDesign response`);
                    }
                }
                else {
                    logger_1.logger.warn(`[${contextId}] ⚠️ No brand details in ValueDesign response`);
                }
                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                // STEP 7: Deduct from Wallet
                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                logger_1.logger.info(`[${contextId}] Step 7/7: Deducting from wallet...`);
                const deductResult = await wallet_service_1.walletService.deductWalletBalance(data.userId, totalAmount, order.id);
                logger_1.logger.info(`[${contextId}] ✓ Wallet balance deducted`, {
                    amount: totalAmount,
                    previousBalance: currentBalance,
                    newBalance: deductResult.newBalance,
                });
                // Mark order as completed
                await this.updateOrderStatus(order.id, database_1.OrderStatus.COMPLETED);
                logger_1.logger.info('════════════════════════════════════════════════════════════════');
                logger_1.logger.info(`[${contextId}] ✅ Order completed successfully`);
                logger_1.logger.info('════════════════════════════════════════════════════════════════');
                return this.mapOrderDTO(order);
            }
            catch (vdError) {
                // If ValueDesign call fails, mark order as failed (don't deduct wallet)
                logger_1.logger.error(`[${contextId}] ❌ ValueDesign purchase failed`, {
                    error: vdError instanceof Error ? vdError.message : String(vdError),
                });
                await this.updateOrderStatus(order.id, database_1.OrderStatus.FAILED, vdError instanceof Error ? vdError.message : 'Purchase failed');
                throw vdError;
            }
        }
        catch (error) {
            logger_1.logger.error(`[${contextId}] ❌ Order creation failed`, {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get order by ID
     */
    async getOrder(orderId, userId) {
        try {
            logger_1.logger.info('Fetching order', { orderId, userId });
            let query = supabase_1.supabase.from('voucher_orders').select('*').eq('id', orderId);
            if (userId) {
                query = query.eq('user_id', userId);
            }
            const { data: order, error } = await query.single();
            if (error || !order) {
                throw new errors_1.NotFoundError(`Order with ID ${orderId} not found`);
            }
            logger_1.logger.info('✓ Order fetched', { orderId });
            return this.mapOrderDTO(order);
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch order', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get order by order_id (unique order identifier like ORD-xxx)
     */
    async getOrderByOrderId(orderId, userId) {
        try {
            logger_1.logger.info('Fetching order by order_id', { orderId, userId });
            let query = supabase_1.supabase.from('voucher_orders').select('*').eq('order_id', orderId);
            if (userId) {
                query = query.eq('user_id', userId);
            }
            const { data: order, error } = await query.single();
            if (error || !order) {
                throw new errors_1.NotFoundError(`Order ${orderId} not found`);
            }
            logger_1.logger.info('✓ Order fetched by order_id', { orderId });
            return this.mapOrderDTO(order);
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch order by order_id', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get user's orders with pagination
     */
    async getUserOrders(userId, limit = 50, offset = 0) {
        try {
            logger_1.logger.info('Fetching user orders', { userId, limit, offset });
            // Get total count
            const { count } = await supabase_1.supabase
                .from('voucher_orders')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId);
            // Get paginated results
            const { data: orders, error } = await supabase_1.supabase
                .from('voucher_orders')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error) {
                throw new Error(`Failed to fetch orders: ${error.message}`);
            }
            logger_1.logger.info('✓ User orders fetched', { count: orders?.length || 0, total: count });
            return {
                orders: (orders || []).map((order) => this.mapOrderDTO(order)),
                total: count || 0,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch user orders', {
                userId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Update order status
     */
    async updateOrderStatus(orderId, status, notes) {
        try {
            logger_1.logger.info('Updating order status', { orderId, status, notes });
            const updateData = {
                order_status: status,
                updated_at: new Date().toISOString(),
            };
            if (status === database_1.OrderStatus.COMPLETED) {
                updateData.completed_at = new Date().toISOString();
            }
            if (notes) {
                updateData.notes = notes;
            }
            const { data: order, error } = await supabase_1.supabase
                .from('voucher_orders')
                .update(updateData)
                .eq('id', orderId)
                .select()
                .single();
            if (error || !order) {
                throw new Error(`Failed to update order: ${error?.message || 'Unknown error'}`);
            }
            logger_1.logger.info('✓ Order status updated', { orderId, status });
            return this.mapOrderDTO(order);
        }
        catch (error) {
            logger_1.logger.error('Failed to update order status', {
                orderId,
                status,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Add voucher items to order
     */
    async addVoucherItems(orderId, merchantId, items) {
        try {
            logger_1.logger.info('Adding voucher items to order', { orderId, itemCount: items.length });
            const itemsToInsert = items.map((item) => ({
                order_id: orderId,
                merchant_id: merchantId || null,
                card_number: item.card_number || '',
                card_pin: item.card_pin || '',
                card_status: item.card_status || 'active',
                balance_basic: item.balance_basic || 0,
                balance_bonus: item.balance_bonus || 0,
                balance_total: item.balance_total || item.balance_basic || 0,
                expiry_date: item.expiry_date || null,
                activation_url: item.activation_url || null,
                is_redeemed: false,
            }));
            const { data: inserted, error } = await supabase_1.supabase
                .from('voucher_items')
                .insert(itemsToInsert)
                .select();
            if (error) {
                throw new Error(`Failed to insert voucher items: ${error.message}`);
            }
            logger_1.logger.info('✓ Voucher items added', { count: inserted?.length || 0 });
            return inserted || [];
        }
        catch (error) {
            logger_1.logger.error('Failed to add voucher items', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get voucher items for order
     */
    async getVoucherItems(orderId) {
        try {
            logger_1.logger.info('Fetching voucher items', { orderId });
            const { data: items, error } = await supabase_1.supabase
                .from('voucher_items')
                .select('*')
                .eq('order_id', orderId)
                .order('created_at', { ascending: true });
            if (error) {
                throw new Error(`Failed to fetch voucher items: ${error.message}`);
            }
            logger_1.logger.info('✓ Voucher items fetched', { count: items?.length || 0 });
            return items || [];
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch voucher items', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Store ValueDesign response
     */
    async storeValueDesignResponse(orderId, vdRefNo, response) {
        try {
            logger_1.logger.info('Storing ValueDesign response', { orderId, vdRefNo });
            const { error } = await supabase_1.supabase
                .from('voucher_orders')
                .update({
                vd_request_ref_no: vdRefNo,
                vd_response: response,
                updated_at: new Date().toISOString(),
            })
                .eq('id', orderId);
            if (error) {
                throw new Error(`Failed to store response: ${error.message}`);
            }
            logger_1.logger.info('✓ ValueDesign response stored');
        }
        catch (error) {
            logger_1.logger.error('Failed to store ValueDesign response', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Cancel order (only if pending/processing)
     */
    async cancelOrder(orderId, reason) {
        try {
            logger_1.logger.info('Cancelling order', { orderId, reason });
            const { data: order, error: fetchError } = await supabase_1.supabase
                .from('voucher_orders')
                .select('order_status')
                .eq('id', orderId)
                .single();
            if (fetchError || !order) {
                throw new errors_1.NotFoundError(`Order ${orderId} not found`);
            }
            // Can only cancel pending or processing orders
            if (![database_1.OrderStatus.PENDING, database_1.OrderStatus.PROCESSING].includes(order.order_status)) {
                throw new errors_1.ValidationError(`Cannot cancel order in ${order.order_status} status. Only PENDING or PROCESSING orders can be cancelled.`);
            }
            return this.updateOrderStatus(orderId, database_1.OrderStatus.FAILED, reason || 'Order cancelled by user');
        }
        catch (error) {
            logger_1.logger.error('Failed to cancel order', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Map VoucherOrder database record to OrderDTO
     */
    mapOrderDTO(order) {
        return {
            id: order.id,
            orderId: order.order_id,
            brandCode: order.brand_code,
            brandName: order.brand_name,
            quantity: order.quantity,
            totalAmount: order.total_amount,
            status: order.order_status,
            recipient: {
                name: `${order.recipient_first_name} ${order.recipient_last_name}`.trim(),
                email: order.recipient_email,
                mobile: order.recipient_mobile,
            },
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            completedAt: order.completed_at || undefined,
        };
    }
}
exports.OrderService = OrderService;
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT SINGLETON INSTANCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.orderService = new OrderService();
//# sourceMappingURL=order.service.js.map