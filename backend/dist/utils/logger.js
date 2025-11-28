"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
class Logger {
    constructor(level = 'info') {
        this.level = level;
    }
    formatLog(entry) {
        const { timestamp, level, message, context } = entry;
        const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
    }
    shouldLog(level) {
        const levels = ['error', 'warn', 'info', 'debug'];
        const currentIndex = levels.indexOf(this.level);
        const messageIndex = levels.indexOf(level);
        return messageIndex <= currentIndex;
    }
    error(message, context) {
        if (this.shouldLog('error')) {
            const entry = {
                timestamp: new Date().toISOString(),
                level: 'error',
                message,
                context,
            };
            console.error(this.formatLog(entry));
        }
    }
    warn(message, context) {
        if (this.shouldLog('warn')) {
            const entry = {
                timestamp: new Date().toISOString(),
                level: 'warn',
                message,
                context,
            };
            console.warn(this.formatLog(entry));
        }
    }
    info(message, context) {
        if (this.shouldLog('info')) {
            const entry = {
                timestamp: new Date().toISOString(),
                level: 'info',
                message,
                context,
            };
            console.log(this.formatLog(entry));
        }
    }
    debug(message, context) {
        if (this.shouldLog('debug')) {
            const entry = {
                timestamp: new Date().toISOString(),
                level: 'debug',
                message,
                context,
            };
            console.log(this.formatLog(entry));
        }
    }
}
exports.logger = new Logger(process.env.LOG_LEVEL || 'info');
//# sourceMappingURL=logger.js.map