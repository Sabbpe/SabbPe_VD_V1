import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import fs from 'fs';
import { supabase } from '../src/config/supabase';
import { logger } from '../src/utils/logger';
import { stringify } from 'csv-stringify/sync';

async function exportBrands() {
    logger.info('📥 Exporting brands from database...');
    
    const { data: brands, error } = await supabase
        .from('brand_cache')
        .select('*')
        .eq('is_active', true);
    
    if (error) {
        logger.error('Failed to fetch brands:', error);
        process.exit(1);
    }
    
    logger.info(`✅ Fetched ${brands.length} brands`);
    
    // Use proper CSV stringify library
    const csv = stringify(brands, {
        header: true,
        quoted: true,
        quoted_string: true
    });
    
    fs.writeFileSync('data/brand_cache_export.csv', csv);
    logger.info('✅ Exported to data/brand_cache_export.csv');
    
    process.exit(0);
}

exportBrands();
