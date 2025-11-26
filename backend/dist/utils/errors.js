"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SabbpeError = exports.ValueDesignError = exports.InternalServerError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    constructor(statusCode, message, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message) {
        super(400, message, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource) {
        super(404, `${resource} not found`, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(401, message, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(403, message, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends AppError {
    constructor(resource) {
        super(409, `${resource} already exists`, 'CONFLICT');
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(500, message, 'INTERNAL_SERVER_ERROR');
        this.name = 'InternalServerError';
    }
}
exports.InternalServerError = InternalServerError;
class ValueDesignError extends AppError {
    constructor(message, statusCode = 500) {
        super(statusCode, message, 'VALUEDESIGN_ERROR');
        this.name = 'ValueDesignError';
    }
}
exports.ValueDesignError = ValueDesignError;
class SabbpeError extends AppError {
    constructor(message, statusCode = 500) {
        super(statusCode, message, 'SABBPE_ERROR');
        this.name = 'SabbpeError';
    }
}
exports.SabbpeError = SabbpeError;
//# sourceMappingURL=errors.js.map