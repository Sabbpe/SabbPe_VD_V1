"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerErrorHandler = registerErrorHandler;
const logger_1 = require("../utils/logger");
/**
 * Register error handlers - must be called after all other middleware/routes
 */
function registerErrorHandler(app) {
    // 404 handler for undefined routes
    app.use((_req, res) => {
        res.status(404).json({
            success: false,
            error: 'Route not found',
            path: _req.path,
            method: _req.method,
        });
    });
    // Global error handler (must be last middleware)
    app.use((err, _req, res, _next) => {
        const appError = err;
        // Log error details
        logger_1.logger.error('Unhandled error', {
            message: err.message,
            stack: err.stack,
            path: _req.path,
            method: _req.method,
            statusCode: appError.statusCode || 500,
        });
        // Custom application error with specific status code
        if (appError.statusCode && appError.code) {
            res.status(appError.statusCode).json({
                success: false,
                error: appError.message,
                code: appError.code,
            });
            return;
        }
        // Default 500 error
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? err.message : undefined,
            code: 'INTERNAL_SERVER_ERROR',
        });
    });
}
//# sourceMappingURL=errorHandler.js.map