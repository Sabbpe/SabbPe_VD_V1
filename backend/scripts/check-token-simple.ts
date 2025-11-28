import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { supabase } from '../src/config/supabase';

async function check() {
    const { data } = await supabase
        .from('valuedesign_token_cache')
        .select('token, expiry_date');
    
    console.log(data && data.length > 0 ? '❌ Old token exists' : '✅ Token cache empty');
    process.exit(0);
}

check();
