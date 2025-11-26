"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const logger_1 = require("../utils/logger");
const valuedesign_service_1 = require("../services/valuedesign.service");
const supabase_1 = require("../config/supabase");
const uuid_1 = require("uuid");
const wallet_service_1 = require("../services/wallet.service");
const router = (0, express_1.Router)();
// ============================================================================
// MIDDLEWARE - Request ID
// ============================================================================
router.use((req, res, next) => {
    const requestId = `orders-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.locals.requestId = requestId;
    logger_1.logger.debug(`[${requestId}] ${req.method} ${req.path}`, {
        body: req.body ? JSON.stringify(req.body).substring(0, 150) : undefined,
    });
    next();
});
// ============================================================================
// HELPERS
// ============================================================================
function generateOrderId() {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}
function generateRequestRefNo(distributorId) {
    return `${distributorId}${new Date().toISOString().replace(/[^0-9]/g, '')}`;
}
async function getBrandDetails(requestId, brandCode) {
    try {
        logger_1.logger.info(`[${requestId}] Fetching brand details`, { brandCode });
        const brands = await valuedesign_service_1.valueDesignService.getBrands(brandCode);
        if (!Array.isArray(brands) || brands.length === 0) {
            logger_1.logger.error(`[${requestId}] Brand not found`, { brandCode });
            throw new Error(`Brand not found: ${brandCode}`);
        }
        logger_1.logger.info(`[${requestId}] ✓ Brand details fetched`, {
            brandCode,
            brandName: brands[0].BrandName,
        });
        return brands[0];
    }
    catch (error) {
        logger_1.logger.error(`[${requestId}] Failed to fetch brand details:`, {
            brandCode,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
function validateOrderRequest(requestId, req) {
    logger_1.logger.debug(`[${requestId}] Validating order request`, req);
    if (!req.brand_code) {
        return { valid: false, error: 'brand_code is required' };
    }
    if (!req.denomination || req.denomination < 1) {
        return { valid: false, error: 'denomination must be at least 1' };
    }
    if (!req.quantity || req.quantity < 1) {
        return { valid: false, error: 'quantity must be at least 1' };
    }
    logger_1.logger.info(`[${requestId}] ✓ Request validation passed`);
    return { valid: true };
}
// ============================================================================
// API ENDPOINTS
// ============================================================================
/**
 * POST /api/orders
 * Create a new voucher purchase order - Merchant only
 */
router.post('/', auth_middleware_1.authMiddleware, async (req, res) => {
    const requestId = res.locals.requestId;
    logger_1.logger.info('════════════════════════════════════════════════════════════════');
    logger_1.logger.info(`[${requestId}] 📦 POST /api/orders - Create Order`);
    logger_1.logger.info('════════════════════════════════════════════════════════════════');
    try {
        // ✅ Check if user is approved merchant
        const userType = req.user?.role;
        if (userType !== 'merchant') {
            logger_1.logger.warn(`[${requestId}] ✗ Unauthorized - Not a merchant`, { userType });
            return res.status(403).json({
                error: 'Only approved merchants can purchase vouchers',
                requestId,
            });
        }
        const userId = req.user?.userId;
        if (!userId) {
            logger_1.logger.warn(`[${requestId}] ✗ Unauthorized - User not authenticated`);
            return res.status(401).json({
                error: 'Unauthorized - Please login first',
                requestId,
            });
        }
        logger_1.logger.info(`[${requestId}] ✓ Merchant authenticated:`, { userId });
        // ✅ Fetch merchant_id from merchant_sync
        const { data: merchantData, error: merchantError } = await supabase_1.supabase
            .from('merchant_sync')
            .select('merchant_id')
            .eq('user_id', userId)
            .single();
        if (merchantError || !merchantData) {
            logger_1.logger.error(`[${requestId}] ✗ Merchant record not found`, { userId, error: merchantError });
            return res.status(404).json({
                error: 'Merchant profile not found. Please complete merchant onboarding first.',
                requestId,
            });
        }
        const merchantId = merchantData.merchant_id;
        logger_1.logger.info(`[${requestId}] ✓ Merchant ID found:`, { merchantId });
        const body = req.body;
        logger_1.logger.info(`[${requestId}] Request Body:`, { body: JSON.stringify(body, null, 2) });
        // ✅ Step 1: Validate request
        logger_1.logger.info(`[${requestId}] Step 1/8: Validating request...`);
        const validation = validateOrderRequest(requestId, body);
        if (!validation.valid) {
            logger_1.logger.warn(`[${requestId}] ✗ Validation failed:`, validation.error);
            return res.status(400).json({
                error: validation.error,
                requestId
            });
        }
        logger_1.logger.info(`[${requestId}] ✓ Request validation passed`);
        // ✅ Step 2: Get brand details
        logger_1.logger.info(`[${requestId}] Step 2/8: Fetching brand details...`);
        const brandDetails = await getBrandDetails(requestId, body.brand_code);
        logger_1.logger.info(`[${requestId}] ✓ Brand details fetched`);
        // ✅ Step 3: Validate denomination
        logger_1.logger.info(`[${requestId}] Step 3/8: Validating denomination...`);
        if (body.denomination < brandDetails.minPrice || body.denomination > brandDetails.maxPrice) {
            logger_1.logger.warn(`[${requestId}] ✗ Denomination out of range`);
            return res.status(400).json({
                error: `Denomination must be between ${brandDetails.minPrice} and ${brandDetails.maxPrice}`,
                requestId,
            });
        }
        logger_1.logger.info(`[${requestId}] ✓ Denomination valid`);
        const requiredAmount = body.denomination * body.quantity;
        // ✅ Step 4: Check merchant wallet balance
        logger_1.logger.info(`[${requestId}] Step 4/8: Checking merchant wallet balance...`);
        try {
            const merchantWallet = await wallet_service_1.walletService.getWalletBalance(userId);
            const merchantBalance = merchantWallet.balance; // Already a number, no parseFloat needed
            logger_1.logger.info(`[${requestId}] Merchant Wallet Balance Check:`, {
                required: requiredAmount,
                available: merchantBalance,
            });
            if (merchantBalance < requiredAmount) {
                logger_1.logger.warn(`[${requestId}] ✗ Insufficient merchant wallet balance`);
                return res.status(400).json({
                    error: 'Insufficient wallet balance',
                    required: requiredAmount,
                    available: merchantBalance,
                    requestId,
                });
            }
            logger_1.logger.info(`[${requestId}] ✓ Merchant wallet balance sufficient`);
        }
        catch (walletError) {
            logger_1.logger.error(`[${requestId}] ✗ Failed to check merchant wallet:`, {
                error: walletError instanceof Error ? walletError.message : String(walletError)
            });
            return res.status(500).json({
                error: 'Failed to check wallet balance',
                requestId,
            });
        }
        // ✅ Step 5: Check ValueDesign wallet balance
        logger_1.logger.info(`[${requestId}] Step 5/8: Checking ValueDesign wallet balance...`);
        const vdWalletBalance = await valuedesign_service_1.valueDesignService.getWalletBalance();
        logger_1.logger.info(`[${requestId}] ValueDesign Wallet Balance Check:`, {
            required: requiredAmount,
            available: vdWalletBalance,
        });
        if (parseFloat(vdWalletBalance) < requiredAmount) {
            logger_1.logger.warn(`[${requestId}] ✗ Insufficient ValueDesign wallet balance`);
            return res.status(503).json({
                error: 'Service temporarily unavailable. Please try again later.',
                requestId,
            });
        }
        logger_1.logger.info(`[${requestId}] ✓ ValueDesign wallet balance sufficient`);
        // ✅ Step 6: Generate IDs
        logger_1.logger.info(`[${requestId}] Step 6/8: Generating order IDs...`);
        const orderId = generateOrderId();
        const distributorId = process.env.VD_DISTRIBUTOR_ID || 'VDIDSabbPe';
        const requestRefNo = generateRequestRefNo(distributorId);
        const skuCode = body.brand_code;
        logger_1.logger.info(`[${requestId}] Generated IDs:`, {
            orderId,
            requestRefNo,
            skuCode,
        });
        // ✅ Step 7: Create order record (PENDING)
        logger_1.logger.info(`[${requestId}] Step 7/8: Saving PENDING order to database...`);
        const [firstName, ...lastNameParts] = (body.customer_name || 'Customer Name').split(' ');
        const order = {
            id: (0, uuid_1.v4)(),
            order_id: orderId,
            merchant_id: merchantId,
            user_id: userId,
            brand_code: body.brand_code,
            brand_name: brandDetails.BrandName,
            sku_code: skuCode,
            quantity: body.quantity,
            amount_per_voucher: body.denomination,
            total_amount: requiredAmount,
            currency: 'INR',
            recipient_first_name: firstName || 'Customer',
            recipient_last_name: lastNameParts.join(' ') || 'Name',
            recipient_email: body.customer_email || '',
            recipient_mobile: body.customer_phone || '',
            recipient_address: '',
            recipient_city: '',
            recipient_state: '',
            recipient_pincode: '',
            order_status: 'pending',
            vd_request_ref_no: requestRefNo,
            vd_response: null,
            error_code: null,
            error_message: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        const { error: dbError } = await supabase_1.supabase.from('voucher_orders').insert([order]);
        if (dbError) {
            logger_1.logger.error(`[${requestId}] ✗ Failed to save order:`, dbError);
            return res.status(500).json({
                error: 'Failed to create order',
                requestId
            });
        }
        logger_1.logger.info(`[${requestId}] ✓ Order saved to database (PENDING)`);
        // ✅ Step 8: Purchase EVCs from ValueDesign
        logger_1.logger.info(`[${requestId}] Step 8/8: Purchasing EVCs from ValueDesign...`);
        const evcResponse = await valuedesign_service_1.valueDesignService.getEVCs({
            orderId,
            skuCode,
            noOfCard: body.quantity,
            amount: body.denomination.toString(),
            receiptNo: orderId,
            reqId: requestRefNo,
            firstName: body.customer_name?.split(' ')[0] || 'Customer',
            lastName: body.customer_name?.split(' ')[1] || 'Name',
            email: body.customer_email,
            mobileNo: body.customer_phone,
        });
        logger_1.logger.info(`[${requestId}] EVC Response:`, {
            resultCode: evcResponse.resultCode,
            responseCode: evcResponse.responseCode,
            message: evcResponse.getMarketingMessage || evcResponse.responseMsg,
            isPending: evcResponse.isPending,
        });
        // Check if purchase was successful (check both resultCode and responseCode)
        const isSuccess = evcResponse.resultCode === 0 || evcResponse.resultCode === '0' ||
            evcResponse.responseCode === 0 || evcResponse.responseCode === '0';
        if (!isSuccess && !evcResponse.isPending) {
            logger_1.logger.error(`[${requestId}] ✗ EVC purchase failed`);
            await supabase_1.supabase
                .from('voucher_orders')
                .update({
                order_status: 'failed',
                error_message: evcResponse.getMarketingMessage || evcResponse.responseMsg,
                updated_at: new Date().toISOString(),
            })
                .eq('id', order.id);
            return res.status(400).json({
                error: 'Purchase failed',
                message: evcResponse.getMarketingMessage || evcResponse.responseMsg,
                orderId,
                requestId,
            });
        }
        // Handle pending status
        if (evcResponse.isPending) {
            logger_1.logger.info(`[${requestId}] ⏳ Order is pending - will check status later`);
            await supabase_1.supabase
                .from('voucher_orders')
                .update({
                order_status: 'processing',
                vd_response: evcResponse,
                updated_at: new Date().toISOString(),
            })
                .eq('id', order.id);
            const processingOrder = {
                ...order,
                order_status: 'processing',
                vd_response: evcResponse
            };
            return res.status(202).json({
                ...processingOrder,
                message: 'Order is being processed. Please check status in a few moments.',
                statusCheckUrl: `/api/orders/${orderId}`
            });
        }
        logger_1.logger.info('[' + requestId + '] ✓ EVC purchase successful');
        // Extract voucher items
        const items = [];
        if (evcResponse.brand_details && evcResponse.brand_details[0] && evcResponse.brand_details[0].items) {
            evcResponse.brand_details[0].items.forEach((item, index) => {
                items.push({
                    id: item.getCardNo,
                    card_number: item.getCardNo,
                    card_pin: item.getCardPin,
                    status: item.getCardStatus,
                    expiry_date: item.getExpiryDate,
                    balance_total: item.balanceTotal,
                });
                logger_1.logger.info('[' + requestId + '] Voucher ' + (index + 1) + ':', {
                    cardNo: item.getCardNo,
                    balance: item.balanceTotal,
                });
            });
        }
        logger_1.logger.info('[' + requestId + '] Extracted ' + items.length + ' vouchers');
        // ✅ Insert voucher items into voucher_items table
        if (items.length > 0) {
            logger_1.logger.info('[' + requestId + '] Preparing to insert ' + items.length + ' items...');
            const voucherItemsToInsert = items.map((item) => ({
                id: (0, uuid_1.v4)(),
                order_id: order.id,
                merchant_id: order.merchant_id,
                card_number: item.card_number,
                card_pin: item.card_pin,
                card_status: item.status === 'A' ? 'active' :
                    item.status === 'R' ? 'redeemed' :
                        item.status === 'E' ? 'expired' :
                            item.status === 'C' ? 'cancelled' : 'active',
                balance_basic: parseFloat(item.balance_total || '0'),
                balance_bonus: 0,
                balance_total: parseFloat(item.balance_total || '0'),
                bonus_given: 0,
                expiry_date: item.expiry_date || null,
                activation_url: null,
                is_redeemed: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }));
            const { error: itemsError } = await supabase_1.supabase
                .from('voucher_items')
                .insert(voucherItemsToInsert);
            if (itemsError) {
                logger_1.logger.error('[' + requestId + '] Failed to insert voucher items:', itemsError);
            }
            else {
                logger_1.logger.info('[' + requestId + '] ✓ ' + items.length + ' voucher items saved to database');
            }
        }
        else {
            logger_1.logger.warn('[' + requestId + '] No items to insert - items array is empty!');
        }
        // ✅ Update order to SUCCESS
        const { error: updateError } = await supabase_1.supabase
            .from('voucher_orders')
            .update({
            order_status: 'completed',
            vd_response: evcResponse,
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
        })
            .eq('id', order.id);
        if (updateError) {
            logger_1.logger.error('[' + requestId + '] Failed to update order to completed:', updateError);
        }
        else {
            logger_1.logger.info('[' + requestId + '] ✓ Order updated to completed');
        }
        // ✅ Deduct from merchant wallet
        try {
            logger_1.logger.info('[' + requestId + '] Deducting from merchant wallet...', {
                merchantId,
                amount: requiredAmount,
                orderId: order.id
            });
            await wallet_service_1.walletService.deductWalletBalance(userId, requiredAmount, order.id // Only 3 parameters
            );
            logger_1.logger.info('[' + requestId + '] ✓ Wallet balance deducted successfully');
        }
        catch (walletError) {
            logger_1.logger.error('[' + requestId + '] ⚠️ Failed to deduct wallet balance:', {
                error: walletError instanceof Error ? walletError.message : String(walletError)
            });
            // Don't fail the order, but log the issue for manual reconciliation
        }
        // Fetch items from voucher_items table for response
        logger_1.logger.info('[' + requestId + '] Fetching items from database for response...');
        const { data: dbItems, error: fetchError } = await supabase_1.supabase
            .from('voucher_items')
            .select('*')
            .eq('order_id', order.id);
        if (fetchError) {
            logger_1.logger.error('[' + requestId + '] Failed to fetch items:', fetchError);
        }
        else {
            logger_1.logger.info('[' + requestId + '] Fetched ' + (dbItems?.length || 0) + ' items from database');
        }
        const successOrder = {
            ...order,
            order_status: 'completed',
            items: dbItems || items,
            completed_at: new Date().toISOString()
        };
        logger_1.logger.info('════════════════════════════════════════════════════════════════');
        logger_1.logger.info('[' + requestId + '] ✅ Order Created Successfully!');
        logger_1.logger.info('════════════════════════════════════════════════════════════════');
        return res.status(201).json(successOrder);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error(`[${requestId}] ❌ Error:`, { error: errorMessage });
        return res.status(500).json({
            error: 'Failed to create order',
            message: errorMessage,
            requestId,
        });
    }
});
/**
 * GET /api/orders
 * List all orders for merchant
 */
router.get('/', auth_middleware_1.authMiddleware, async (req, res) => {
    const requestId = res.locals.requestId;
    logger_1.logger.info(`[${requestId}] GET /api/orders - List Orders`);
    try {
        const userType = req.user?.role;
        if (userType !== 'merchant') {
            logger_1.logger.warn(`[${requestId}] ✗ Unauthorized - Not a merchant`, { userType });
            return res.status(403).json({
                error: 'Only merchants can view orders',
                requestId,
            });
        }
        const userId = req.user?.userId;
        if (!userId) {
            logger_1.logger.warn(`[${requestId}] ✗ Unauthorized - User not authenticated`);
            return res.status(401).json({
                error: 'Unauthorized',
                requestId,
            });
        }
        const { status, limit = 50, offset = 0 } = req.query;
        let query = supabase_1.supabase.from('voucher_orders').select('*').eq('user_id', userId);
        if (status) {
            query = query.eq('order_status', status);
        }
        const { data: orders, error } = await query
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit));
        if (error) {
            logger_1.logger.error(`[${requestId}] Failed to fetch orders:`, error);
            return res.status(500).json({ error: 'Failed to fetch orders' });
        }
        logger_1.logger.info(`[${requestId}] ✓ Orders fetched:`, { count: orders?.length || 0 });
        return res.json(orders || []);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error(`[${requestId}] Error:`, { error: errorMessage });
        return res.status(500).json({ error: 'Failed to fetch orders' });
    }
});
/**
 * GET /api/orders/:orderId
 * Get specific order details
 */
router.get('/:orderId', auth_middleware_1.authMiddleware, async (req, res) => {
    const { orderId } = req.params;
    const requestId = res.locals.requestId;
    logger_1.logger.info(`[${requestId}] GET /api/orders/:orderId`, { orderId });
    try {
        const userId = req.user?.userId;
        const { data: order, error } = await supabase_1.supabase
            .from('voucher_orders')
            .select('*')
            .eq('order_id', orderId)
            .eq('user_id', userId)
            .single();
        if (error || !order) {
            logger_1.logger.warn(`[${requestId}] Order not found:`, { orderId });
            return res.status(404).json({ error: 'Order not found' });
        }
        logger_1.logger.info(`[${requestId}] ✓ Order fetched:`, { orderId, status: order.order_status });
        return res.json(order);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error(`[${requestId}] Error:`, { error: errorMessage });
        return res.status(500).json({ error: 'Failed to fetch order' });
    }
});
/**
 * GET /api/orders/:orderId/items
 * Get voucher items for an order
 */
router.get('/:orderId/items', auth_middleware_1.authMiddleware, async (req, res) => {
    const { orderId } = req.params;
    const requestId = res.locals.requestId;
    logger_1.logger.info(`[${requestId}] GET /api/orders/:orderId/items`, { orderId });
    try {
        const userId = req.user?.userId;
        // Get order first to verify ownership
        const { data: order, error: orderError } = await supabase_1.supabase
            .from('voucher_orders')
            .select('id')
            .eq('order_id', orderId)
            .eq('user_id', userId)
            .single();
        if (orderError || !order) {
            logger_1.logger.warn(`[${requestId}] Order not found:`, { orderId });
            return res.status(404).json({ error: 'Order not found' });
        }
        // Fetch items from voucher_items table
        const { data: items, error: itemsError } = await supabase_1.supabase
            .from('voucher_items')
            .select('*')
            .eq('order_id', order.id);
        if (itemsError) {
            logger_1.logger.error(`[${requestId}] Failed to fetch items:`, itemsError);
            return res.status(500).json({ error: 'Failed to fetch items' });
        }
        logger_1.logger.info(`[${requestId}] ✓ Items fetched:`, { orderId, count: items?.length || 0 });
        return res.json({ items: items || [] });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error(`[${requestId}] Error:`, { error: errorMessage });
        return res.status(500).json({ error: 'Failed to fetch items' });
    }
});
/**
 * POST /api/orders/:orderId/cancel
 * Cancel an order (only PENDING orders can be cancelled)
 */
router.post('/:orderId/cancel', auth_middleware_1.authMiddleware, async (req, res) => {
    const { orderId } = req.params;
    const requestId = res.locals.requestId;
    logger_1.logger.info(`[${requestId}] POST /api/orders/:orderId/cancel`, { orderId });
    try {
        const userId = req.user?.userId;
        const { data: order, error } = await supabase_1.supabase
            .from('voucher_orders')
            .select('*')
            .eq('order_id', orderId)
            .eq('user_id', userId)
            .single();
        if (error || !order) {
            logger_1.logger.warn(`[${requestId}] Order not found:`, { orderId });
            return res.status(404).json({ error: 'Order not found' });
        }
        if (order.order_status !== 'pending') {
            logger_1.logger.warn(`[${requestId}] Cannot cancel non-pending order:`, { status: order.order_status });
            return res.status(400).json({
                error: 'Only PENDING orders can be cancelled',
                currentStatus: order.order_status,
            });
        }
        // Update order to FAILED
        const { error: updateError } = await supabase_1.supabase
            .from('voucher_orders')
            .update({
            order_status: 'failed',
            error_message: 'Cancelled by merchant',
            updated_at: new Date().toISOString(),
        })
            .eq('order_id', orderId);
        if (updateError) {
            logger_1.logger.error(`[${requestId}] Failed to cancel order:`, updateError);
            return res.status(500).json({ error: 'Failed to cancel order' });
        }
        logger_1.logger.info(`[${requestId}] ✓ Order cancelled:`, { orderId });
        return res.json({ message: 'Order cancelled successfully', orderId });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error(`[${requestId}] Error:`, { error: errorMessage });
        return res.status(500).json({ error: 'Failed to cancel order' });
    }
});
exports.default = router;
//# sourceMappingURL=orders.routes.js.map