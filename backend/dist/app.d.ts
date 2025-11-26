import { Express } from 'express';
declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
}
export declare function createApp(): Promise<Express>;
export declare function startServer(): Promise<void>;
//# sourceMappingURL=app.d.ts.map