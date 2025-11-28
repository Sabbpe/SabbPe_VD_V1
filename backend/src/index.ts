import dotenv from 'dotenv';
dotenv.config();
import { startServer } from './app';
startServer().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});