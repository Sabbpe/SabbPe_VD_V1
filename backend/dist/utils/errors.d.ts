export declare class AppError extends Error {
    statusCode: number;
    code?: string | undefined;
    constructor(statusCode: number, message: string, code?: string | undefined);
}
export declare class ValidationError extends AppError {
    constructor(message: string);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(resource: string);
}
export declare class InternalServerError extends AppError {
    constructor(message?: string);
}
export declare class ValueDesignError extends AppError {
    constructor(message: string, statusCode?: number);
}
export declare class SabbpeError extends AppError {
    constructor(message: string, statusCode?: number);
}
//# sourceMappingURL=errors.d.ts.map