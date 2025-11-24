import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '@/config/env';
import { testSupabaseConnection } from '@/config/supabase';
import { initializeEncryption } from '@/config/encryption';
import { logger } from '@/utils/logger';

// Import routes
import brandSyncRoutes from '@/routes/brand-sync.routes';
import authRoutes from '@/routes/auth.routes';
import voucherRoutes from '@/routes/vouchers.routes';
import orderRoutes from '@/routes/orders.routes';
import valuedesignRoutes from '@/routes/valuedesign.routes';
import walletRoutes from '@/routes/wallet.routes';

declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
}

// ============================================================================
// REQUEST DEBUGGING MIDDLEWARE
// ============================================================================

/**
 * Detailed request logging middleware
 */
function createDetailedRequestLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();

        req.id = requestId;

        logger.info(`[${requestId}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, {
            method: req.method,
            path: req.path,
            fullUrl: req.originalUrl,
            ip: req.ip,
        });

        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        res.json = function (data: any) {
            const duration = Date.now() - startTime;
            const statusCode = res.statusCode;
            const isError = statusCode >= 400;

            logger.info(`[${requestId}] Response:`, {
                statusCode,
                duration: `${duration}ms`,
                method: req.method,
                path: req.path,
                dataLength: JSON.stringify(data).length,
            });

            if (isError) {
                logger.error(`[${requestId}] ❌ ERROR RESPONSE:`, {
                    statusCode,
                    error: data.error,
                    message: data.message,
                    details: data.details,
                });
            }

            return originalJson(data);
        };

        res.send = function (data: any) {
            const duration = Date.now() - startTime;
            logger.info(`[${requestId}] Response (text/html):`, {
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                method: req.method,
                path: req.path,
            });
            return originalSend(data);
        };

        next();
    };
}

/**
 * Route matching debug middleware
 */
function createRouteMatchingDebugger() {
    return (req: Request, res: Response, next: NextFunction) => {
        const requestId = req.id || 'unknown';

        const knownRoutes = [
            '/api/orders',
            '/api/auth',
            '/api/vouchers',
            '/api/valuedesign',
            '/api/wallet',
            '/api/payment',
            '/api/brands',
            '/health',
            '/health/db',
            '/',
        ];

        const isKnownRoute = knownRoutes.some((route) => {
            if (route === '/') return req.path === '/';
            return req.path.startsWith(route);
        });

        if (!isKnownRoute) {
            logger.warn(`[${requestId}] ⚠️ Route NOT in registered routes:`, {
                path: req.path,
                method: req.method,
                knownRoutes,
            });
        }

        next();
    };
}

/**
 * 404 catch-all handler
 */
function createDetailedNotFoundHandler() {
    return (req: Request, res: Response) => {
        const requestId = req.id || `unknown-${Date.now()}`;

        logger.error(`[${requestId}] 🔴 404 NOT FOUND - ROUTE DOES NOT EXIST`, {
            method: req.method,
            path: req.path,
            fullUrl: req.originalUrl,
            ip: req.ip,
            query: req.query,
            body: req.body ? JSON.stringify(req.body).substring(0, 200) : undefined,
        });

        return res.status(404).json({
            error: 'Route not found',
            requestId,
            method: req.method,
            path: req.path,
            timestamp: new Date().toISOString(),
            hint: 'Check logs for registered routes',
        });
    };
}

export async function createApp(): Promise<Express> {
    const app = express();

    logger.info('🚀 Creating Express application...');

    // ============================================
    // EARLY LOGGING MIDDLEWARE
    // ============================================

    app.use(createDetailedRequestLogger());
    app.use(createRouteMatchingDebugger());

    // ============================================
    // SECURITY MIDDLEWARE
    // ============================================

    app.use(helmet());
    logger.info('✓ Helmet security middleware applied');

    // CORS
    app.use(
        cors({
            origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
                const allowedOrigins = [
                    'http://localhost:8080',
                    'http://localhost:3000',
                    'http://192.168.80.5:8080',
                    'http://34.93.176.245',
                    'https://34.93.176.245',
                    'https://sabbpe-vd-prod',
                    'https://34.100.196.126',
                    'http://34.100.196.126',
                ];
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    logger.warn('CORS violation:', { origin, allowedOrigins });
                    callback(new Error('CORS policy violation'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        })
    );
    logger.info('✓ CORS middleware configured');

    // ============================================
    // BODY PARSING MIDDLEWARE
    // ============================================

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));
    logger.info('✓ Body parsing middleware applied');

    // ============================================
    // HEALTH CHECK ENDPOINTS
    // ============================================

    logger.info('📍 Registering health check endpoints...');

    app.get('/health', (req: Request, res: Response) => {
        logger.debug('Health check requested');
        return res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });

    app.get('/health/db', async (req: Request, res: Response) => {
        try {
            const isConnected = await testSupabaseConnection();
            return res.json({
                status: isConnected ? 'ok' : 'error',
                database: isConnected ? 'connected' : 'disconnected',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            return res.status(500).json({
                status: 'error',
                database: 'disconnected',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    logger.info('✓ Health check endpoints registered');

    // ============================================
    // API ROUTES REGISTRATION
    // ============================================

    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('📦 REGISTERING API ROUTES...');
    logger.info('═══════════════════════════════════════════════════════════════');

    // 1. Brand Sync Routes (NEW)
    logger.info('1️⃣ Registering Brand Sync routes at: /api/brands');
    app.use('/api/brands', brandSyncRoutes);
    logger.info('   ✓ Brand Sync routes registered');
    logger.info('   Available endpoints:');
    logger.info('      POST   /api/brands/sync');
    logger.info('      GET    /api/brands');
    logger.info('      GET    /api/brands/:brandCode');
    logger.info('      GET    /api/brands/category/:category');
    logger.info('      GET    /api/brands/sync/status');

    // 2. ValueDesign Routes
    logger.info('2️⃣ Registering ValueDesign routes at: /api/valuedesign');
    app.use('/api/valuedesign', valuedesignRoutes);
    logger.info('   ✓ ValueDesign routes registered');

    // 3. Auth Routes
    logger.info('3️⃣ Registering Auth routes at: /api/auth');
    app.use('/api/auth', authRoutes);
    logger.info('   ✓ Auth routes registered');

    // 4. Vouchers Routes
    logger.info('4️⃣ Registering Vouchers routes at: /api/vouchers');
    app.use('/api/vouchers', voucherRoutes);
    logger.info('   ✓ Vouchers routes registered');

    // 5. Orders Routes
    logger.info('5️⃣ Registering Orders routes at: /api/orders');
    app.use('/api/orders', (req: Request, res: Response, next: NextFunction) => {
        logger.info(`[${req.id}] ⚡ ENTERING ORDERS ROUTER`, {
            method: req.method,
            path: req.path,
            fullPath: req.originalUrl,
        });
        next();
    });
    app.use('/api/orders', orderRoutes);
    logger.info('   ✓ Orders routes registered');
    logger.info('   Available endpoints:');
    logger.info('      POST   /api/orders');
    logger.info('      GET    /api/orders');
    logger.info('      GET    /api/orders/:orderId');
    logger.info('      GET    /api/orders/:orderId/items');
    logger.info('      POST   /api/orders/:orderId/cancel');

    // 6. Wallet Routes
    logger.info('6️⃣ Registering Wallet routes at: /api/wallet');
    app.use('/api/wallet', (req: Request, res: Response, next: NextFunction) => {
        logger.info(`[${req.id}] 💰 ENTERING WALLET ROUTER`, {
            method: req.method,
            path: req.path,
            fullPath: req.originalUrl,
        });
        next();
    });
    app.use('/api/wallet', walletRoutes);
    logger.info('   ✓ Wallet routes registered');
    logger.info('   Available endpoints:');
    logger.info('      GET    /api/wallet/balance');
    logger.info('      POST   /api/wallet/topup');
    logger.info('      GET    /api/wallet/transactions');

    // 7. Payment Routes
    logger.info('7️⃣ Registering Payment Callback at: /api/payment');
    app.use('/api/payment', walletRoutes);
    logger.info('   ✓ Payment callback routes registered');
    logger.info('   Available endpoints:');
    logger.info('      POST   /api/payment/callback');

    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('✅ ALL ROUTES REGISTERED SUCCESSFULLY');
    logger.info('═══════════════════════════════════════════════════════════════');

    // ============================================
    // ROOT ENDPOINT
    // ============================================

    app.get('/', (req: Request, res: Response) => {
        return res.json({
            message: 'ValueDesign + SabbPe Backend API',
            version: '1.0.0',
            routes: {
                health: 'GET /health',
                healthDb: 'GET /health/db',
                brands: 'GET /api/brands, POST /api/brands/sync',
                valuedesign: 'GET /api/valuedesign/brands',
                auth: 'POST /api/auth/guest-login, POST /api/auth/merchant-register',
                vouchers: 'GET /api/vouchers/brands, GET /api/vouchers/categories',
                orders: 'POST /api/orders, GET /api/orders',
                wallet: 'GET /api/wallet/balance, POST /api/wallet/topup',
                payment: 'POST /api/payment/callback',
            },
        });
    });

    // ============================================
    // ERROR HANDLING MIDDLEWARE
    // ============================================

    app.use(createDetailedNotFoundHandler());

    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        const requestId = req.id || `error-${Date.now()}`;

        logger.error(`[${requestId}] 🔴 UNHANDLED ERROR:`, {
            method: req.method,
            path: req.path,
            status: err.status || 500,
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        });

        return res.status(err.status || 500).json({
            error: err.message || 'Internal Server Error',
            requestId,
            timestamp: new Date().toISOString(),
        });
    });

    logger.info('✓ Error handling middleware registered');

    return app;
}

export async function startServer(): Promise<void> {
    try {
        logger.info('═══════════════════════════════════════════════════════════════');
        logger.info('🚀 Starting ValueDesign + SabbPe Backend...');
        logger.info('═══════════════════════════════════════════════════════════════');

        // Test Supabase connection
        logger.info('🔗 Testing Supabase connection...');
        const dbConnected = await testSupabaseConnection();
        if (!dbConnected && config.nodeEnv === 'production') {
            throw new Error('Failed to connect to Supabase in production');
        }
        logger.info(dbConnected ? '✓ Supabase connected' : '⚠️ Supabase connection warning');

        // Initialize encryption services
        logger.info('🔐 Initializing encryption services...');
        initializeEncryption();
        logger.info('✓ Encryption initialized');

        // Create Express app
        logger.info('📝 Creating Express application...');
        const app = await createApp();
        logger.info('✓ Express app created');

        // Start server
        const PORT = parseInt(process.env.PORT || config.port.toString(), 10);
        const server = app.listen(PORT, '0.0.0.0', () => {
            logger.info('═══════════════════════════════════════════════════════════════');
            logger.info('✅ SERVER STARTED SUCCESSFULLY');
            logger.info('═══════════════════════════════════════════════════════════════');
            logger.info(`📍 Server: http://localhost:${PORT}`);
            logger.info(`🌍 Environment: ${config.nodeEnv}`);
            logger.info(`⏰ Started at: ${new Date().toISOString()}`);
            logger.info('═══════════════════════════════════════════════════════════════');
            logger.info('📚 API Documentation:');
            logger.info('   🏥 GET  /health                      - Health check');
            logger.info('   🏥 GET  /health/db                   - Database health');
            logger.info('   🎁 POST /api/brands/sync             - Sync brands from VD');
            logger.info('   🎁 GET  /api/brands                  - Get all brands');
            logger.info('   🎁 GET  /api/brands/:brandCode       - Get brand by code');
            logger.info('   📦 POST /api/orders                  - Create order');
            logger.info('   📦 GET  /api/orders                  - List orders');
            logger.info('   📦 GET  /api/orders/:orderId         - Get order');
            logger.info('   📦 GET  /api/orders/:orderId/items   - Get voucher items');
            logger.info('   📦 POST /api/orders/:orderId/cancel  - Cancel order');
            logger.info('   💰 GET  /api/wallet/balance          - Get wallet balance');
            logger.info('   💰 POST /api/wallet/topup            - Topup wallet');
            logger.info('   💰 POST /api/payment/callback        - Payment callback');
            logger.info('═══════════════════════════════════════════════════════════════');

            logger.info(`\n🔗 Test with: curl http://localhost:${PORT}/health\n`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully...');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully...');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });

        process.on('unhandledRejection', (reason: any) => {
            logger.error('Unhandled Rejection:', {
                reason: reason instanceof Error ? reason.message : String(reason),
            });
        });

        process.on('uncaughtException', (error: Error) => {
            logger.error('Uncaught Exception:', {
                message: error.message,
                stack: error.stack,
            });
            process.exit(1);
        });
    } catch (error) {
        logger.error('🔴 FAILED TO START SERVER:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
    }
}
