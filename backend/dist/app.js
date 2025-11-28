"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./config/env");
const supabase_1 = require("./config/supabase");
const encryption_1 = require("./config/encryption");
const logger_1 = require("./utils/logger");
// Import routes
const brand_sync_routes_1 = __importDefault(require("./routes/brand-sync.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const vouchers_routes_1 = __importDefault(require("./routes/vouchers.routes"));
const orders_routes_1 = __importDefault(require("./routes/orders.routes"));
const valuedesign_routes_1 = __importDefault(require("./routes/valuedesign.routes"));
const wallet_routes_1 = __importDefault(require("./routes/wallet.routes"));
// ============================================================================
// REQUEST DEBUGGING MIDDLEWARE
// ============================================================================
/**
 * Detailed request logging middleware
 */
function createDetailedRequestLogger() {
    return (req, res, next) => {
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        req.id = requestId;
        logger_1.logger.info(`[${requestId}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, {
            method: req.method,
            path: req.path,
            fullUrl: req.originalUrl,
            ip: req.ip,
        });
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);
        res.json = function (data) {
            const duration = Date.now() - startTime;
            const statusCode = res.statusCode;
            const isError = statusCode >= 400;
            logger_1.logger.info(`[${requestId}] Response:`, {
                statusCode,
                duration: `${duration}ms`,
                method: req.method,
                path: req.path,
                dataLength: JSON.stringify(data).length,
            });
            if (isError) {
                logger_1.logger.error(`[${requestId}] ❌ ERROR RESPONSE:`, {
                    statusCode,
                    error: data.error,
                    message: data.message,
                    details: data.details,
                });
            }
            return originalJson(data);
        };
        res.send = function (data) {
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[${requestId}] Response (text/html):`, {
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
    return (req, res, next) => {
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
            if (route === '/')
                return req.path === '/';
            return req.path.startsWith(route);
        });
        if (!isKnownRoute) {
            logger_1.logger.warn(`[${requestId}] ⚠️ Route NOT in registered routes:`, {
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
    return (req, res) => {
        const requestId = req.id || `unknown-${Date.now()}`;
        logger_1.logger.error(`[${requestId}] 🔴 404 NOT FOUND - ROUTE DOES NOT EXIST`, {
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
async function createApp() {
    const app = (0, express_1.default)();
    logger_1.logger.info('🚀 Creating Express application...');
    // ============================================
    // EARLY LOGGING MIDDLEWARE
    // ============================================
    app.use(createDetailedRequestLogger());
    app.use(createRouteMatchingDebugger());
    // ============================================
    // SECURITY MIDDLEWARE
    // ============================================
    app.use((0, helmet_1.default)());
    logger_1.logger.info('✓ Helmet security middleware applied');
    // CORS
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            const allowedOrigins = [
                'http://localhost:8080',
                'http://localhost:3000',
                'http://192.168.80.5:8080',
                'http://34.93.176.245',
                'https://34.93.176.245',
                'https://sabbpe-vd-prod',
                'https://34.100.196.126',
                'http://34.100.196.126',
                'https://giftvouchers.sabbpe.com', // ✅ ADD THIS LINE
            ];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                logger_1.logger.warn('CORS violation:', { origin, allowedOrigins });
                callback(new Error('CORS policy violation'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    logger_1.logger.info('✓ CORS middleware configured');
    // ============================================
    // BODY PARSING MIDDLEWARE
    // ============================================
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
    logger_1.logger.info('✓ Body parsing middleware applied');
    // ============================================
    // HEALTH CHECK ENDPOINTS
    // ============================================
    logger_1.logger.info('📍 Registering health check endpoints...');
    app.get('/health', (req, res) => {
        logger_1.logger.debug('Health check requested');
        return res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });
    app.get('/health/db', async (req, res) => {
        try {
            const isConnected = await (0, supabase_1.testSupabaseConnection)();
            return res.json({
                status: isConnected ? 'ok' : 'error',
                database: isConnected ? 'connected' : 'disconnected',
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            return res.status(500).json({
                status: 'error',
                database: 'disconnected',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    logger_1.logger.info('✓ Health check endpoints registered');
    // ============================================
    // API ROUTES REGISTRATION
    // ============================================
    logger_1.logger.info('═══════════════════════════════════════════════════════════════');
    logger_1.logger.info('📦 REGISTERING API ROUTES...');
    logger_1.logger.info('═══════════════════════════════════════════════════════════════');
    // 1. Brand Sync Routes (NEW)
    logger_1.logger.info('1️⃣ Registering Brand Sync routes at: /api/brands');
    app.use('/api/brands', brand_sync_routes_1.default);
    logger_1.logger.info('   ✓ Brand Sync routes registered');
    logger_1.logger.info('   Available endpoints:');
    logger_1.logger.info('      POST   /api/brands/sync');
    logger_1.logger.info('      GET    /api/brands');
    logger_1.logger.info('      GET    /api/brands/:brandCode');
    logger_1.logger.info('      GET    /api/brands/category/:category');
    logger_1.logger.info('      GET    /api/brands/sync/status');
    // 2. ValueDesign Routes
    logger_1.logger.info('2️⃣ Registering ValueDesign routes at: /api/valuedesign');
    app.use('/api/valuedesign', valuedesign_routes_1.default);
    logger_1.logger.info('   ✓ ValueDesign routes registered');
    // 3. Auth Routes
    logger_1.logger.info('3️⃣ Registering Auth routes at: /api/auth');
    app.use('/api/auth', auth_routes_1.default);
    logger_1.logger.info('   ✓ Auth routes registered');
    // 4. Vouchers Routes
    logger_1.logger.info('4️⃣ Registering Vouchers routes at: /api/vouchers');
    app.use('/api/vouchers', vouchers_routes_1.default);
    logger_1.logger.info('   ✓ Vouchers routes registered');
    // 5. Orders Routes
    logger_1.logger.info('5️⃣ Registering Orders routes at: /api/orders');
    app.use('/api/orders', (req, res, next) => {
        logger_1.logger.info(`[${req.id}] ⚡ ENTERING ORDERS ROUTER`, {
            method: req.method,
            path: req.path,
            fullPath: req.originalUrl,
        });
        next();
    });
    app.use('/api/orders', orders_routes_1.default);
    logger_1.logger.info('   ✓ Orders routes registered');
    logger_1.logger.info('   Available endpoints:');
    logger_1.logger.info('      POST   /api/orders');
    logger_1.logger.info('      GET    /api/orders');
    logger_1.logger.info('      GET    /api/orders/:orderId');
    logger_1.logger.info('      GET    /api/orders/:orderId/items');
    logger_1.logger.info('      POST   /api/orders/:orderId/cancel');
    // 6. Wallet Routes
    logger_1.logger.info('6️⃣ Registering Wallet routes at: /api/wallet');
    app.use('/api/wallet', (req, res, next) => {
        logger_1.logger.info(`[${req.id}] 💰 ENTERING WALLET ROUTER`, {
            method: req.method,
            path: req.path,
            fullPath: req.originalUrl,
        });
        next();
    });
    app.use('/api/wallet', wallet_routes_1.default);
    logger_1.logger.info('   ✓ Wallet routes registered');
    logger_1.logger.info('   Available endpoints:');
    logger_1.logger.info('      GET    /api/wallet/balance');
    logger_1.logger.info('      POST   /api/wallet/topup');
    logger_1.logger.info('      GET    /api/wallet/transactions');
    // 7. Payment Routes
    logger_1.logger.info('7️⃣ Registering Payment Callback at: /api/payment');
    app.use('/api/payment', wallet_routes_1.default);
    logger_1.logger.info('   ✓ Payment callback routes registered');
    logger_1.logger.info('   Available endpoints:');
    logger_1.logger.info('      POST   /api/payment/callback');
    logger_1.logger.info('═══════════════════════════════════════════════════════════════');
    logger_1.logger.info('✅ ALL ROUTES REGISTERED SUCCESSFULLY');
    logger_1.logger.info('═══════════════════════════════════════════════════════════════');
    // ============================================
    // ROOT ENDPOINT
    // ============================================
    app.get('/', (req, res) => {
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
    app.use((err, req, res, next) => {
        const requestId = req.id || `error-${Date.now()}`;
        logger_1.logger.error(`[${requestId}] 🔴 UNHANDLED ERROR:`, {
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
    logger_1.logger.info('✓ Error handling middleware registered');
    return app;
}
async function startServer() {
    try {
        logger_1.logger.info('═══════════════════════════════════════════════════════════════');
        logger_1.logger.info('🚀 Starting ValueDesign + SabbPe Backend...');
        logger_1.logger.info('═══════════════════════════════════════════════════════════════');
        // Test Supabase connection
        logger_1.logger.info('🔗 Testing Supabase connection...');
        const dbConnected = await (0, supabase_1.testSupabaseConnection)();
        if (!dbConnected && env_1.config.nodeEnv === 'production') {
            throw new Error('Failed to connect to Supabase in production');
        }
        logger_1.logger.info(dbConnected ? '✓ Supabase connected' : '⚠️ Supabase connection warning');
        // Initialize encryption services
        logger_1.logger.info('🔐 Initializing encryption services...');
        (0, encryption_1.initializeEncryption)();
        logger_1.logger.info('✓ Encryption initialized');
        // Create Express app
        logger_1.logger.info('📝 Creating Express application...');
        const app = await createApp();
        logger_1.logger.info('✓ Express app created');
        // Start server
        const PORT = parseInt(process.env.PORT || env_1.config.port.toString(), 10);
        const server = app.listen(PORT, '0.0.0.0', () => {
            logger_1.logger.info('═══════════════════════════════════════════════════════════════');
            logger_1.logger.info('✅ SERVER STARTED SUCCESSFULLY');
            logger_1.logger.info('═══════════════════════════════════════════════════════════════');
            logger_1.logger.info(`📍 Server: http://localhost:${PORT}`);
            logger_1.logger.info(`🌍 Environment: ${env_1.config.nodeEnv}`);
            logger_1.logger.info(`⏰ Started at: ${new Date().toISOString()}`);
            logger_1.logger.info('═══════════════════════════════════════════════════════════════');
            logger_1.logger.info('📚 API Documentation:');
            logger_1.logger.info('   🏥 GET  /health                      - Health check');
            logger_1.logger.info('   🏥 GET  /health/db                   - Database health');
            logger_1.logger.info('   🎁 POST /api/brands/sync             - Sync brands from VD');
            logger_1.logger.info('   🎁 GET  /api/brands                  - Get all brands');
            logger_1.logger.info('   🎁 GET  /api/brands/:brandCode       - Get brand by code');
            logger_1.logger.info('   📦 POST /api/orders                  - Create order');
            logger_1.logger.info('   📦 GET  /api/orders                  - List orders');
            logger_1.logger.info('   📦 GET  /api/orders/:orderId         - Get order');
            logger_1.logger.info('   📦 GET  /api/orders/:orderId/items   - Get voucher items');
            logger_1.logger.info('   📦 POST /api/orders/:orderId/cancel  - Cancel order');
            logger_1.logger.info('   💰 GET  /api/wallet/balance          - Get wallet balance');
            logger_1.logger.info('   💰 POST /api/wallet/topup            - Topup wallet');
            logger_1.logger.info('   💰 POST /api/payment/callback        - Payment callback');
            logger_1.logger.info('═══════════════════════════════════════════════════════════════');
            logger_1.logger.info(`\n🔗 Test with: curl http://localhost:${PORT}/health\n`);
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger_1.logger.info('SIGTERM received, shutting down gracefully...');
            server.close(() => {
                logger_1.logger.info('Server closed');
                process.exit(0);
            });
        });
        process.on('SIGINT', () => {
            logger_1.logger.info('SIGINT received, shutting down gracefully...');
            server.close(() => {
                logger_1.logger.info('Server closed');
                process.exit(0);
            });
        });
        process.on('unhandledRejection', (reason) => {
            logger_1.logger.error('Unhandled Rejection:', {
                reason: reason instanceof Error ? reason.message : String(reason),
            });
        });
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught Exception:', {
                message: error.message,
                stack: error.stack,
            });
            process.exit(1);
        });
    }
    catch (error) {
        logger_1.logger.error('🔴 FAILED TO START SERVER:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
    }
}
//# sourceMappingURL=app.js.map