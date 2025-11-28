// ============================================================
// LOAD ENVIRONMENT VARIABLES FIRST
// ============================================================
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ============================================================
// NOW IMPORT APPLICATION MODULES
// ============================================================
import { supabase } from '../src/config/supabase';
import { valueDesignService } from '../src/services/valuedesign.service';
import { logger } from '../src/utils/logger';

async function syncAllStores() {
    try {
        logger.info('🚀 Starting batch store sync...');
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // 1. Fetch all active brands from database
        const { data: brands, error } = await supabase
            .from('brand_cache')
            .select('brand_code, brand_name')
            .eq('is_active', true)
            .order('brand_name');

        if (error) {
            logger.error('Failed to fetch brands from database:', { error: error.message });
            process.exit(1);
        }

        if (!brands || brands.length === 0) {
            logger.warn('No active brands found in database');
            process.exit(0);
        }

        logger.info(`📦 Found ${brands.length} active brands to sync`);
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        let successCount = 0;
        let failCount = 0;
        let totalStores = 0;

        // 2. Loop through each brand and sync stores
        for (let i = 0; i < brands.length; i++) {
            const brand = brands[i];
            const progress = `[${i + 1}/${brands.length}]`;

            try {
                logger.info(`${progress} Syncing stores for: ${brand.brand_name} (${brand.brand_code})`);

                const stores = await valueDesignService.getStores(
                    brand.brand_code,
                    true,  // Force refresh
                    true   // Include geocoding
                );

                const geocodedCount = stores.filter(s => s.latitude).length;
                totalStores += stores.length;
                successCount++;

                logger.info(`${progress} ✓ Synced ${stores.length} stores (${geocodedCount} geocoded) for ${brand.brand_name}`);

                // Wait 2 seconds between brands to avoid rate limiting
                if (i < brands.length - 1) {
                    logger.info(`${progress} ⏳ Waiting 2 seconds before next sync...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                logger.info(''); // Empty line for readability

            } catch (error) {
                failCount++;
                logger.error(`${progress} ❌ Failed to sync stores for ${brand.brand_name}:`, {
                    error: error instanceof Error ? error.message : String(error)
                });
                logger.info(''); // Empty line for readability
            }
        }

        // 3. Summary
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.info('✅ BATCH STORE SYNC COMPLETE');
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.info(`📊 Summary:`);
        logger.info(`   Total Brands: ${brands.length}`);
        logger.info(`   Successful: ${successCount}`);
        logger.info(`   Failed: ${failCount}`);
        logger.info(`   Total Stores Synced: ${totalStores}`);
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(failCount > 0 ? 1 : 0);

    } catch (error) {
        logger.error('❌ FATAL ERROR in batch sync:', {
            error: error instanceof Error ? error.message : String(error)
        });
        process.exit(1);
    }
}

// Run the sync
syncAllStores();
