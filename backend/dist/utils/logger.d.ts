export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
declare class Logger {
    private level;
    constructor(level?: LogLevel);
    private formatLog;
    private shouldLog;
    error(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    debug(message: string, context?: Record<string, unknown>): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map