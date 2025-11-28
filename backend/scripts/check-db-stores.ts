import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { supabase } from '../src/config/supabase';

async function checkDB() {
    console.log('\n🔍 Checking store_cache table...\n');
    
    const { count, error: countError } = await supabase
        .from('store_cache')
        .select('*', { count: 'exact', head: true });
    
    console.log('Total stores:', count);
    
    if (countError) {
        console.error('Count error:', countError);
        process.exit(1);
    }
    
    if (!count || count === 0) {
        console.log('❌ Table is EMPTY!');
        console.log('\nThis means the cacheStores() method is failing silently.');
        console.log('Check for unique constraint violations or missing columns.');
        process.exit(1);
    }
    
    const { data, error } = await supabase
        .from('store_cache')
        .select('store_code, brand_name, city, is_active, synced_at')
        .limit(5);
    
    console.log('\nSample stores:');
    console.table(data);
    
    const { data: activeCount } = await supabase
        .from('store_cache')
        .select('is_active')
        .eq('is_active', true);
    
    const { data: inactiveCount } = await supabase
        .from('store_cache')
        .select('is_active')
        .eq('is_active', false);
    
    console.log('\n📊 Status breakdown:');
    console.log('Active:', activeCount?.length || 0);
    console.log('Inactive:', inactiveCount?.length || 0);
    
    process.exit(0);
}

checkDB();
