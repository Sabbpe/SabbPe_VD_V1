"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.testSupabaseConnection = testSupabaseConnection;
const supabase_js_1 = require("@supabase/supabase-js");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
exports.supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: false,
    },
});
// Helper function to check connection
async function testSupabaseConnection() {
    try {
        const { data, error } = await exports.supabase
            .from('brand_cache')
            .select('id')
            .limit(1);
        if (error) {
            console.error('Supabase connection error:', error);
            return false;
        }
        console.log('✓ Supabase connected successfully');
        return true;
    }
    catch (error) {
        console.error('Failed to test Supabase connection:', error);
        return false;
    }
}
//# sourceMappingURL=supabase.js.map