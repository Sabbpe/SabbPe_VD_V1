import { VoucherItem, OrderStatus } from '../../types/database';
export interface CreateOrderDTO {
    userId: string;
    merchantId?: string;
    brandCode: string;
    quantity: number;
    amountPerVoucher: number;
    recipientFirstName: string;
    recipientLastName: string;
    recipientMobile: string;
    recipientEmail: string;
    recipientAddress?: string;
    recipientCity?: string;
    recipientState?: string;
    recipientPincode?: string;
}
export interface OrderDTO {
    id: string;
    orderId: string;
    brandCode: string;
    brandName: string;
    quantity: number;
    totalAmount: number;
    status: OrderStatus;
    recipient: {
        name: string;
        email: string;
        mobile: string;
    };
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}
export declare class OrderService {
    /**
     * Get brand details from cache
     */
    private getBrandDetails;
    /**
     * Create new order with complete flow
     */
    createOrder(data: CreateOrderDTO): Promise<OrderDTO>;
    /**
     * Get order by ID
     */
    getOrder(orderId: string, userId?: string): Promise<OrderDTO>;
    /**
     * Get order by order_id (unique order identifier like ORD-xxx)
     */
    getOrderByOrderId(orderId: string, userId?: string): Promise<OrderDTO>;
    /**
     * Get user's orders with pagination
     */
    getUserOrders(userId: string, limit?: number, offset?: number): Promise<{
        orders: OrderDTO[];
        total: number;
    }>;
    /**
     * Update order status
     */
    updateOrderStatus(orderId: string, status: OrderStatus, notes?: string): Promise<OrderDTO>;
    /**
     * Add voucher items to order
     */
    addVoucherItems(orderId: string, merchantId: string, items: Partial<VoucherItem>[]): Promise<VoucherItem[]>;
    /**
     * Get voucher items for order
     */
    getVoucherItems(orderId: string): Promise<VoucherItem[]>;
    /**
     * Store ValueDesign response
     */
    storeValueDesignResponse(orderId: string, vdRefNo: string, response: Record<string, any>): Promise<void>;
    /**
     * Cancel order (only if pending/processing)
     */
    cancelOrder(orderId: string, reason?: string): Promise<OrderDTO>;
    /**
     * Map VoucherOrder database record to OrderDTO
     */
    private mapOrderDTO;
}
export declare const orderService: OrderService;
//# sourceMappingURL=order.service.d.ts.map