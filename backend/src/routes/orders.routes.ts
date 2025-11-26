import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '@/middleware/auth.middleware';
import { logger } from '@/utils/logger';
import { valueDesignService } from '@/services/valuedesign.service';
import { supabase } from '@/config/supabase';
import { v4 as uuidv4 } from 'uuid';
import { walletService } from '@/services/wallet.service';

const router = Router();

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface CreateOrderRequest {
    brand_code: string;
    denomination: number;
    quantity: number;
    customer_email?: string;
    customer_phone?: string;
    customer_name?: string;
}

interface OrderItem {
    id: string;
    card_number?: string;
    card_pin?: string;
    status: string;
    expiry_date?: string;
    balance_total?: string;
}

interface Order {
    id: string;
    order_id: string;
    merchant_id: string | null;
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
    order_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    vd_request_ref_no: string;
    vd_response?: any | null;
    error_code?: string | null;
    error_message?: string | null;
    items?: OrderItem[];
    created_at: string;
    updated_at: string;
    completed_at?: string;
}

// ============================================================================
// MIDDLEWARE - Request ID
// ============================================================================

router.use((req: Request, res: Response, next) => {
    const requestId = `orders-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.locals.requestId = requestId;
    logger.debug(`[${requestId}] ${req.method} ${req.path}`, {
        body: req.body ? JSON.stringify(req.body).substring(0, 150) : undefined,
    });
    next();
});

// ============================================================================
// HELPERS
// ============================================================================

function generateOrderId(): string {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function generateRequestRefNo(distributorId: string): string {
    return `${distributorId}${new Date().toISOString().replace(/[^0-9]/g, '')}`;
}

async function getBrandDetails(requestId: string, brandCode: string): Promise<any> {
    try {
        logger.info(`[${requestId}] Fetching brand details`, { brandCode });
        const brands = await valueDesignService.getBrands(brandCode);

        if (!Array.isArray(brands) || brands.length === 0) {
            logger.error(`[${requestId}] Brand not found`, { brandCode });
            throw new Error(`Brand not found: ${brandCode}`);
        }

        logger.info(`[${requestId}] ✓ Brand details fetched`, {
            brandCode,
            brandName: brands[0].BrandName,
        });

        return brands[0];
    } catch (error) {
        logger.error(`[${requestId}] Failed to fetch brand details:`, {
            brandCode,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

function validateOrderRequest(requestId: string, req: CreateOrderRequest): { valid: boolean; error?: string } {
    logger.debug(`[${requestId}] Validating order request`, req as any);

    if (!req.brand_code) {
        return { valid: false, error: 'brand_code is required' };
    }

    if (!req.denomination || req.denomination < 1) {
        return { valid: false, error: 'denomination must be at least 1' };
    }

    if (!req.quantity || req.quantity < 1) {
        return { valid: false, error: 'quantity must be at least 1' };
    }

    logger.info(`[${requestId}] ✓ Request validation passed`);
    return { valid: true };
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * POST /api/orders
 * Create a new voucher purchase order - Merchant only
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    const requestId = res.locals.requestId;

    logger.info('════════════════════════════════════════════════════════════════');
    logger.info(`[${requestId}] 📦 POST /api/orders - Create Order`);
    logger.info('════════════════════════════════════════════════════════════════');

    try {
        // ✅ Check if user is approved merchant
        const userType = req.user?.role;
        if (userType !== 'merchant') {
            logger.warn(`[${requestId}] ✗ Unauthorized - Not a merchant`, { userType });
            return res.status(403).json({
                error: 'Only approved merchants can purchase vouchers',
                requestId,
            });
        }

        const userId = req.user?.userId;
        if (!userId) {
            logger.warn(`[${requestId}] ✗ Unauthorized - User not authenticated`);
            return res.status(401).json({
                error: 'Unauthorized - Please login first',
                requestId,
            });
        }

        logger.info(`[${requestId}] ✓ Merchant authenticated:`, { userId });

        // ✅ Fetch merchant_id from merchant_sync
        const { data: merchantData, error: merchantError } = await supabase
            .from('merchant_sync')
            .select('merchant_id')
            .eq('user_id', userId)
            .single();

        if (merchantError || !merchantData) {
            logger.error(`[${requestId}] ✗ Merchant record not found`, { userId, error: merchantError });
            return res.status(404).json({
                error: 'Merchant profile not found. Please complete merchant onboarding first.',
                requestId,
            });
        }

        const merchantId = merchantData.merchant_id;
        logger.info(`[${requestId}] ✓ Merchant ID found:`, { merchantId });

        const body: CreateOrderRequest = req.body;

        logger.info(`[${requestId}] Request Body:`, { body: JSON.stringify(body, null, 2) });

        // ✅ Step 1: Validate request
        logger.info(`[${requestId}] Step 1/8: Validating request...`);
        const validation = validateOrderRequest(requestId, body);
        if (!validation.valid) {
            logger.warn(`[${requestId}] ✗ Validation failed:`, validation.error as any);
            return res.status(400).json({
                error: validation.error,
                requestId
            });
        }
        logger.info(`[${requestId}] ✓ Request validation passed`);

        // ✅ Step 2: Get brand details
        logger.info(`[${requestId}] Step 2/8: Fetching brand details...`);
        const brandDetails = await getBrandDetails(requestId, body.brand_code);
        logger.info(`[${requestId}] ✓ Brand details fetched`);

        // ✅ Step 3: Validate denomination
        logger.info(`[${requestId}] Step 3/8: Validating denomination...`);
        if (body.denomination < brandDetails.minPrice || body.denomination > brandDetails.maxPrice) {
            logger.warn(`[${requestId}] ✗ Denomination out of range`);
            return res.status(400).json({
                error: `Denomination must be between ${brandDetails.minPrice} and ${brandDetails.maxPrice}`,
                requestId,
            });
        }
        logger.info(`[${requestId}] ✓ Denomination valid`);

        const requiredAmount = body.denomination * body.quantity;

        // ✅ Step 4: Check merchant wallet balance
        logger.info(`[${requestId}] Step 4/8: Checking merchant wallet balance...`);
try {
    const merchantWallet = await walletService.getWalletBalance(userId);
    const merchantBalance = merchantWallet.balance; // Already a number, no parseFloat needed

    logger.info(`[${requestId}] Merchant Wallet Balance Check:`, {
        required: requiredAmount,
        available: merchantBalance,
    });

    if (merchantBalance < requiredAmount) {
        logger.warn(`[${requestId}] ✗ Insufficient merchant wallet balance`);
        return res.status(400).json({
            error: 'Insufficient wallet balance',
            required: requiredAmount,
            available: merchantBalance,
            requestId,
        });
    }
    logger.info(`[${requestId}] ✓ Merchant wallet balance sufficient`);
} catch (walletError) {
    logger.error(`[${requestId}] ✗ Failed to check merchant wallet:`, {
        error: walletError instanceof Error ? walletError.message : String(walletError)
    });
    return res.status(500).json({
        error: 'Failed to check wallet balance',
        requestId,
    });
}

        // ✅ Step 5: Check ValueDesign wallet balance
        logger.info(`[${requestId}] Step 5/8: Checking ValueDesign wallet balance...`);
        const vdWalletBalance = await valueDesignService.getWalletBalance();

        logger.info(`[${requestId}] ValueDesign Wallet Balance Check:`, {
            required: requiredAmount,
            available: vdWalletBalance,
        });

        if (parseFloat(vdWalletBalance) < requiredAmount) {
            logger.warn(`[${requestId}] ✗ Insufficient ValueDesign wallet balance`);
            return res.status(503).json({
                error: 'Service temporarily unavailable. Please try again later.',
                requestId,
            });
        }
        logger.info(`[${requestId}] ✓ ValueDesign wallet balance sufficient`);

        // ✅ Step 6: Generate IDs
        logger.info(`[${requestId}] Step 6/8: Generating order IDs...`);
        const orderId = generateOrderId();
        const distributorId = process.env.VD_DISTRIBUTOR_ID || 'VDIDSabbPe';
        const requestRefNo = generateRequestRefNo(distributorId);
        const skuCode = body.brand_code;

        logger.info(`[${requestId}] Generated IDs:`, {
            orderId,
            requestRefNo,
            skuCode,
        });

        // ✅ Step 7: Create order record (PENDING)
        logger.info(`[${requestId}] Step 7/8: Saving PENDING order to database...`);
        const [firstName, ...lastNameParts] = (body.customer_name || 'Customer Name').split(' ');
        const order = {
            id: uuidv4(),
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

        const { error: dbError } = await supabase.from('voucher_orders').insert([order]);

        if (dbError) {
            logger.error(`[${requestId}] ✗ Failed to save order:`, dbError as any);
            return res.status(500).json({
                error: 'Failed to create order',
                requestId
            });
        }
        logger.info(`[${requestId}] ✓ Order saved to database (PENDING)`);

        // ✅ Step 8: Purchase EVCs from ValueDesign
        logger.info(`[${requestId}] Step 8/8: Purchasing EVCs from ValueDesign...`);
        const evcResponse = await valueDesignService.getEVCs({
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

        logger.info(`[${requestId}] EVC Response:`, {
            resultCode: evcResponse.resultCode,
            responseCode: evcResponse.responseCode,
            message: evcResponse.getMarketingMessage || evcResponse.responseMsg,
            isPending: evcResponse.isPending,
        });

        // Check if purchase was successful (check both resultCode and responseCode)
        const isSuccess = 
            evcResponse.resultCode === 0 || evcResponse.resultCode === '0' ||
            evcResponse.responseCode === 0 || evcResponse.responseCode === '0';

        if (!isSuccess && !evcResponse.isPending) {
            logger.error(`[${requestId}] ✗ EVC purchase failed`);

            await supabase
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
            logger.info(`[${requestId}] ⏳ Order is pending - will check status later`);
            
            await supabase
                .from('voucher_orders')
                .update({
                    order_status: 'processing',
                    vd_response: evcResponse,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', order.id);

            const processingOrder: Order = { 
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

        logger.info('[' + requestId + '] ✓ EVC purchase successful');

        // Extract voucher items
        const items: OrderItem[] = [];
        if (evcResponse.brand_details && evcResponse.brand_details[0] && evcResponse.brand_details[0].items) {
            evcResponse.brand_details[0].items.forEach((item: any, index: number) => {
                items.push({
                    id: item.getCardNo,
                    card_number: item.getCardNo,
                    card_pin: item.getCardPin,
                    status: item.getCardStatus,
                    expiry_date: item.getExpiryDate,
                    balance_total: item.balanceTotal,
                });
                logger.info('[' + requestId + '] Voucher ' + (index + 1) + ':', {
                    cardNo: item.getCardNo,
                    balance: item.balanceTotal,
                });
            });
        }

        logger.info('[' + requestId + '] Extracted ' + items.length + ' vouchers');

        // ✅ Insert voucher items into voucher_items table
        if (items.length > 0) {
            logger.info('[' + requestId + '] Preparing to insert ' + items.length + ' items...');
            
            const voucherItemsToInsert = items.map((item) => ({
                id: uuidv4(),
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

            const { error: itemsError } = await supabase
                .from('voucher_items')
                .insert(voucherItemsToInsert);

            if (itemsError) {
                logger.error('[' + requestId + '] Failed to insert voucher items:', itemsError as any);
            } else {
                logger.info('[' + requestId + '] ✓ ' + items.length + ' voucher items saved to database');
            }
        } else {
            logger.warn('[' + requestId + '] No items to insert - items array is empty!');
        }

        // ✅ Update order to SUCCESS
        const { error: updateError } = await supabase
            .from('voucher_orders')
            .update({
                order_status: 'completed',
                vd_response: evcResponse,
                updated_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
            })
            .eq('id', order.id);

        if (updateError) {
            logger.error('[' + requestId + '] Failed to update order to completed:', updateError as any);
        } else {
            logger.info('[' + requestId + '] ✓ Order updated to completed');
        }

        // ✅ Deduct from merchant wallet
        try {
    logger.info('[' + requestId + '] Deducting from merchant wallet...', {
        merchantId,
        amount: requiredAmount,
        orderId: order.id
    });

    await walletService.deductWalletBalance(
        userId,
        requiredAmount,
        order.id  // Only 3 parameters
    );

    logger.info('[' + requestId + '] ✓ Wallet balance deducted successfully');
} catch (walletError) {
    logger.error('[' + requestId + '] ⚠️ Failed to deduct wallet balance:', {
        error: walletError instanceof Error ? walletError.message : String(walletError)
    });
    // Don't fail the order, but log the issue for manual reconciliation
}

        // Fetch items from voucher_items table for response
        logger.info('[' + requestId + '] Fetching items from database for response...');
        const { data: dbItems, error: fetchError } = await supabase
            .from('voucher_items')
            .select('*')
            .eq('order_id', order.id);

        if (fetchError) {
            logger.error('[' + requestId + '] Failed to fetch items:', fetchError as any);
        } else {
            logger.info('[' + requestId + '] Fetched ' + (dbItems?.length || 0) + ' items from database');
        }

        const successOrder: Order = { 
            ...order, 
            order_status: 'completed', 
            items: dbItems || items,
            completed_at: new Date().toISOString()
        };

        logger.info('════════════════════════════════════════════════════════════════');
        logger.info('[' + requestId + '] ✅ Order Created Successfully!');
        logger.info('════════════════════════════════════════════════════════════════');

        return res.status(201).json(successOrder);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[${requestId}] ❌ Error:`, { error: errorMessage });
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
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    const requestId = res.locals.requestId;
    logger.info(`[${requestId}] GET /api/orders - List Orders`);

    try {
        const userType = req.user?.role;
        if (userType !== 'merchant') {
            logger.warn(`[${requestId}] ✗ Unauthorized - Not a merchant`, { userType });
            return res.status(403).json({
                error: 'Only merchants can view orders',
                requestId,
            });
        }

        const userId = req.user?.userId;
        if (!userId) {
            logger.warn(`[${requestId}] ✗ Unauthorized - User not authenticated`);
            return res.status(401).json({
                error: 'Unauthorized',
                requestId,
            });
        }

        const { status, limit = 50, offset = 0 } = req.query;

        let query = supabase.from('voucher_orders').select('*').eq('user_id', userId);

        if (status) {
            query = query.eq('order_status', status);
        }

        const { data: orders, error } = await query
            .order('created_at', { ascending: false })
            .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string));

        if (error) {
            logger.error(`[${requestId}] Failed to fetch orders:`, error as any);
            return res.status(500).json({ error: 'Failed to fetch orders' });
        }

        logger.info(`[${requestId}] ✓ Orders fetched:`, { count: orders?.length || 0 });
        return res.json(orders || []);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[${requestId}] Error:`, { error: errorMessage });
        return res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

/**
 * GET /api/orders/:orderId
 * Get specific order details
 */
router.get('/:orderId', authMiddleware, async (req: AuthRequest, res: Response) => {
    const { orderId } = req.params;
    const requestId = res.locals.requestId;
    logger.info(`[${requestId}] GET /api/orders/:orderId`, { orderId });

    try {
        const userId = req.user?.userId;

        const { data: order, error } = await supabase
            .from('voucher_orders')
            .select('*')
            .eq('order_id', orderId)
            .eq('user_id', userId)
            .single();

        if (error || !order) {
            logger.warn(`[${requestId}] Order not found:`, { orderId });
            return res.status(404).json({ error: 'Order not found' });
        }

        logger.info(`[${requestId}] ✓ Order fetched:`, { orderId, status: order.order_status });
        return res.json(order);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[${requestId}] Error:`, { error: errorMessage });
        return res.status(500).json({ error: 'Failed to fetch order' });
    }
});

/**
 * GET /api/orders/:orderId/items
 * Get voucher items for an order
 */
router.get('/:orderId/items', authMiddleware, async (req: AuthRequest, res: Response) => {
    const { orderId } = req.params;
    const requestId = res.locals.requestId;
    logger.info(`[${requestId}] GET /api/orders/:orderId/items`, { orderId });

    try {
        const userId = req.user?.userId;

        // Get order first to verify ownership
        const { data: order, error: orderError } = await supabase
            .from('voucher_orders')
            .select('id')
            .eq('order_id', orderId)
            .eq('user_id', userId)
            .single();

        if (orderError || !order) {
            logger.warn(`[${requestId}] Order not found:`, { orderId });
            return res.status(404).json({ error: 'Order not found' });
        }

        // Fetch items from voucher_items table
        const { data: items, error: itemsError } = await supabase
            .from('voucher_items')
            .select('*')
            .eq('order_id', order.id);

        if (itemsError) {
            logger.error(`[${requestId}] Failed to fetch items:`, itemsError as any);
            return res.status(500).json({ error: 'Failed to fetch items' });
        }

        logger.info(`[${requestId}] ✓ Items fetched:`, { orderId, count: items?.length || 0 });
        return res.json({ items: items || [] });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[${requestId}] Error:`, { error: errorMessage });
        return res.status(500).json({ error: 'Failed to fetch items' });
    }
});

/**
 * POST /api/orders/:orderId/cancel
 * Cancel an order (only PENDING orders can be cancelled)
 */
router.post('/:orderId/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
    const { orderId } = req.params;
    const requestId = res.locals.requestId;
    logger.info(`[${requestId}] POST /api/orders/:orderId/cancel`, { orderId });

    try {
        const userId = req.user?.userId;

        const { data: order, error } = await supabase
            .from('voucher_orders')
            .select('*')
            .eq('order_id', orderId)
            .eq('user_id', userId)
            .single();

        if (error || !order) {
            logger.warn(`[${requestId}] Order not found:`, { orderId });
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.order_status !== 'pending') {
            logger.warn(`[${requestId}] Cannot cancel non-pending order:`, { status: order.order_status });
            return res.status(400).json({
                error: 'Only PENDING orders can be cancelled',
                currentStatus: order.order_status,
            });
        }

        // Update order to FAILED
        const { error: updateError } = await supabase
            .from('voucher_orders')
            .update({
                order_status: 'failed',
                error_message: 'Cancelled by merchant',
                updated_at: new Date().toISOString(),
            })
            .eq('order_id', orderId);

        if (updateError) {
            logger.error(`[${requestId}] Failed to cancel order:`, updateError as any);
            return res.status(500).json({ error: 'Failed to cancel order' });
        }

        logger.info(`[${requestId}] ✓ Order cancelled:`, { orderId });
        return res.json({ message: 'Order cancelled successfully', orderId });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[${requestId}] Error:`, { error: errorMessage });
        return res.status(500).json({ error: 'Failed to cancel order' });
    }
});

export default router;
