import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { supabase } from '../src/config/supabase';
import { logger } from '../src/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

interface BrandRecord {
    id: string;
    brand_code: string;
    brand_name: string;
    brand_type: string;
    category: string;
    description: string;
    denomination_list: string;
    terms_and_conditions: string;
    redeem_steps: string;
    important_instructions: string;
    [key: string]: any;
}

interface EnhancedBrand extends BrandRecord {
    channel: string;
    voucher_bills: string;
    sub_description: string;
    validity_days: number;
}

// ============================================================================
// KEYWORD EXTRACTION
// ============================================================================

function extractKeywordsFromData(records: BrandRecord[]) {
    logger.info('🧠 Learning keywords from brand data...');
    
    const keywordFrequency: Record<string, number> = {};
    const categoryKeywords: Record<string, Record<string, number>> = {};
    
    const stopWords = new Set([
        'the', 'and', 'for', 'with', 'you', 'your', 'this', 'that',
        'from', 'are', 'can', 'will', 'been', 'have', 'has', 'had',
        'not', 'but', 'what', 'all', 'were', 'when', 'there', 'use'
    ]);
    
    records.forEach(record => {
        const text = `${record.brand_name} ${record.description}`.toLowerCase();
        const category = record.category || 'General';
        
        const words = text.match(/\b[a-z]{3,}\b/g) || [];
        
        words.forEach(word => {
            if (!stopWords.has(word)) {
                keywordFrequency[word] = (keywordFrequency[word] || 0) + 1;
                
                if (!categoryKeywords[category]) {
                    categoryKeywords[category] = {};
                }
                categoryKeywords[category][word] = (categoryKeywords[category][word] || 0) + 1;
            }
        });
    });
    
    const topKeywordsByCategory: Record<string, string[]> = {};
    
    Object.keys(categoryKeywords).forEach(category => {
        const sorted = Object.entries(categoryKeywords[category])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word]) => word);
        
        topKeywordsByCategory[category] = sorted;
        logger.info(`   ${category}: ${sorted.slice(0, 5).join(', ')}...`);
    });
    
    return { keywordFrequency, categoryKeywords, topKeywordsByCategory };
}

function determineSubDescription(
    brandName: string,
    category: string,
    description: string,
    learnedKeywords: any
): string {
    const text = `${brandName} ${description}`.toLowerCase();
    const words = text.match(/\b[a-z]{3,}\b/g) || [];
    
    const categoryWords = learnedKeywords.topKeywordsByCategory[category] || [];
    const matches = words.filter(word => categoryWords.includes(word));
    const unique = [...new Set(matches)].slice(0, 3);
    
    if (unique.length > 0) {
        return unique.join(', ');
    }
    
    return category.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// ============================================================================
// ENHANCED CHANNEL DETECTION WITH PLURALS
// ============================================================================

function determineChannel(brandName: string, category: string, description: string): string {
    const text = `${brandName} ${category} ${description}`.toLowerCase();
    
    // ONLINE KEYWORDS (with plurals and comprehensive terms)
    const onlineKeywords = [
        // Gaming & Digital
        'steam', 'gaming', 'game', 'games', 'gamer', 'gamers',
        'digital', 'download', 'downloads', 'downloadable',
        'virtual', 'online', 'internet', 'web', 'website', 'websites',
        
        // E-Gift & Vouchers
        'e-gift', 'egift', 'e-voucher', 'evoucher', 'e-card', 'ecard',
        'instant', 'code', 'codes', 'pin', 'pins', 'redeem', 'redemption',
        
        // E-Commerce Platforms
        'amazon', 'flipkart', 'myntra', 'ajio', 'tata cliq', 'meesho',
        'nykaa', 'bigbasket', 'blinkit', 'swiggy', 'zomato',
        
        // Streaming & Entertainment
        'netflix', 'prime', 'hotstar', 'zee5', 'sony liv', 'voot',
        'spotify', 'youtube', 'subscription', 'subscriptions',
        'streaming', 'stream', 'ott', 'video', 'music',
        
        // Mobile & Recharge
        'mobile', 'recharge', 'recharges', 'topup', 'top-up',
        'wallet', 'wallets', 'prepaid', 'app', 'apps', 'application',
        
        // Delivery & Online Services
        'delivery', 'deliveries', 'home delivery', 'doorstep',
        'shipped', 'shipping', 'courier', 'express delivery'
    ];
    
    // OFFLINE KEYWORDS (with plurals and comprehensive terms)
    const offlineKeywords = [
        // Physical Locations
        'store', 'stores', 'outlet', 'outlets', 'shop', 'shops',
        'showroom', 'showrooms', 'retail', 'retails', 'retailer', 'retailers',
        
        // Shopping Centers
        'mall', 'malls', 'shopping center', 'shopping centres',
        'plaza', 'plazas', 'complex', 'marketplace',
        
        // Food & Dining
        'restaurant', 'restaurants', 'cafe', 'cafes', 'coffee shop',
        'dine-in', 'dining', 'eatery', 'eateries', 'bistro', 'bistros',
        'dhaba', 'dhabas', 'canteen', 'food court', 'quick service',
        
        // Entertainment Venues
        'pvr', 'inox', 'cinema', 'cinemas', 'multiplex', 'theatre',
        'theaters', 'movie hall', 'gaming zone', 'arcade',
        
        // Services & Wellness
        'salon', 'salons', 'spa', 'spas', 'parlour', 'parlours',
        'gym', 'gyms', 'fitness center', 'clinic', 'clinics',
        'hospital', 'hospitals', 'pharmacy', 'medical center',
        
        // Fuel & Automotive
        'fuel', 'petrol', 'diesel', 'gas station', 'petrol pump',
        'petrol pumps', 'fuel station', 'service station',
        
        // Jewelry & Gold
        'jewellery store', 'jewelry shop', 'goldsmith',
        
        // Other Physical Services
        'branch', 'branches', 'counter', 'counters', 'kiosk', 'kiosks',
        'point of sale', 'pos', 'physical location', 'walk-in',
        'visit our', 'nearest location', 'find us at'
    ];
    
    const hasOnline = onlineKeywords.some(kw => text.includes(kw));
    const hasOffline = offlineKeywords.some(kw => text.includes(kw));
    
    if (hasOnline && hasOffline) return 'Both';
    if (hasOnline) return 'Online';
    if (hasOffline) return 'Offline';
    
    // Category-based fallback
    const categoryMap: Record<string, string> = {
        'Gaming': 'Online',
        'E-Commerce': 'Online',
        'Entertainment': 'Online',
        'Fashion & Lifestyle': 'Both',
        'Food & Beverage': 'Both',
        'Food & Beverages': 'Both',
        'Tour & Travel': 'Online',
        'Travel': 'Online',
        'Jewellery': 'Both',
        'Sports & Footwears': 'Both',
        'Wellness & Beauty': 'Both',
        'Health & Wellness': 'Both'
    };
    
    return categoryMap[category] || 'Both';
}

// ============================================================================
// CORRECTED VOUCHER BILLS DETECTION
// Can customer use multiple vouchers in ONE transaction/bill?
// ============================================================================

function determineVoucherBills(
    termsAndConditions: string,
    redeemSteps: string,
    importantInstructions: string
): string {
    const allText = `${termsAndConditions} ${redeemSteps} ${importantInstructions}`.toLowerCase();
    
    // Keywords indicating SINGLE voucher per transaction (RESTRICTION)
    const singleKeywords = [
        'only one voucher per',
        'one voucher per transaction',
        'one voucher per bill',
        'one voucher per purchase',
        'one voucher per order',
        'single voucher per',
        'cannot combine vouchers',
        'cannot be combined',
        'cannot club vouchers',
        'vouchers cannot be clubbed',
        'not clubbable',
        'non-clubbable',
        'only 1 voucher',
        'one voucher only',
        'one card per',
        'single redemption',
        'cannot use multiple vouchers',
        'multiple vouchers not allowed',
        'not valid with other vouchers',
        'not applicable with other',
        'one voucher at a time',
        'only one gift card',
        'one gift card per',
        'single card per'
    ];
    
    // Keywords indicating MULTIPLE vouchers per transaction (ALLOWED)
    const multipleKeywords = [
        'multiple vouchers can be used',
        'can use multiple vouchers',
        'combine vouchers',
        'club vouchers',
        'clubbable',
        'vouchers can be combined',
        'vouchers can be clubbed',
        'use more than one voucher',
        'use multiple cards',
        'multiple redemption allowed',
        'combine multiple',
        'more than one voucher',
        'several vouchers can be used',
        'can be clubbed',
        'multiple vouchers allowed',
        'use multiple gift cards',
        'combine gift cards'
    ];
    
    // Check for single voucher restriction (PRIORITY - restrictions are explicit)
    const hasSingleRestriction = singleKeywords.some(keyword => 
        allText.includes(keyword)
    );
    
    if (hasSingleRestriction) {
        return '1';
    }
    
    // Check for multiple voucher allowance
    const allowsMultiple = multipleKeywords.some(keyword => 
        allText.includes(keyword)
    );
    
    if (allowsMultiple) {
        return 'Multiple';
    }
    
    // Default: assume single (safer default - most brands restrict to 1)
    return '1';
}

// ============================================================================
// VALIDITY EXTRACTION
// ============================================================================

function extractValidity(termsAndConditions: string, brandType: string): number {
    if (!termsAndConditions) return 365;
    
    try {
        const terms = JSON.parse(termsAndConditions);
        const text = (terms.text || '').toLowerCase();
        
        const patterns = [
            { regex: /(\d+)\s*year/i, multiplier: 365 },
            { regex: /(\d+)\s*month/i, multiplier: 30 },
            { regex: /(\d+)\s*day/i, multiplier: 1 }
        ];
        
        for (const { regex, multiplier } of patterns) {
            const match = text.match(regex);
            if (match) {
                const number = parseInt(match[1]);
                if (text.includes('year')) return number * 365;
                if (text.includes('month')) return number * 30;
                return number * multiplier;
            }
        }
    } catch (e) {
        // Not JSON
    }
    
    return 365;
}

// ============================================================================
// MAIN PROCESS
// ============================================================================

async function enhanceBrandData(csvPath: string) {
    logger.info('🚀 Starting brand data enhancement with CORRECTED logic...');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!fs.existsSync(csvPath)) {
        logger.error(`❌ File not found: ${csvPath}`);
        process.exit(1);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records: BrandRecord[] = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true
    });
    
    logger.info(`✅ Loaded ${records.length} brand records`);
    
    const learnedKeywords = extractKeywordsFromData(records);
    
    logger.info('🔄 Enhancing brand data...');
    
    const enhanced: EnhancedBrand[] = records.map((record, idx) => {
        const channel = determineChannel(record.brand_name, record.category, record.description);
        
        // CORRECTED: Check terms/redeem/instructions for voucher usage rules
        const voucherBills = determineVoucherBills(
            record.terms_and_conditions || '',
            record.redeem_steps || '',
            record.important_instructions || ''
        );
        
        const subDescription = determineSubDescription(
            record.brand_name,
            record.category,
            record.description,
            learnedKeywords
        );
        const validityDays = extractValidity(record.terms_and_conditions, record.brand_type);
        
        if ((idx + 1) % 100 === 0) {
            logger.info(`   ✓ Processed ${idx + 1}/${records.length} records`);
        }
        
        return {
            ...record,
            channel,
            voucher_bills: voucherBills,
            sub_description: subDescription,
            validity_days: validityDays
        };
    });
    
    logger.info(`✅ Enhanced all ${enhanced.length} records`);
    
    await updateDatabase(enhanced);
    showStatistics(enhanced);
    
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('🎉 Brand enhancement complete!');
}

async function updateDatabase(enhanced: EnhancedBrand[]) {
    logger.info('💾 Updating database...');
    
    const batchSize = 100;
    let updated = 0;
    
    for (let i = 0; i < enhanced.length; i += batchSize) {
        const batch = enhanced.slice(i, i + batchSize);
        
        for (const record of batch) {
            const { error } = await supabase
                .from('brand_cache')
                .update({
                    channel: record.channel,
                    voucher_bills: record.voucher_bills,
                    sub_description: record.sub_description,
                    validity_days: record.validity_days,
                    updated_at: new Date().toISOString()
                })
                .eq('id', record.id);
            
            if (error) {
                logger.error(`   Failed to update ${record.brand_name}:`, error.message);
            } else {
                updated++;
            }
        }
        
        logger.info(`   ✓ Updated batch ${Math.floor(i/batchSize) + 1} (${updated}/${enhanced.length})`);
    }
    
    logger.info(`✅ Database updated: ${updated} records`);
}

function showStatistics(records: EnhancedBrand[]) {
    logger.info('');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('                    📊 STATISTICS                           ');
    logger.info('═══════════════════════════════════════════════════════════');
    
    const stats = {
        channels: {} as Record<string, number>,
        voucherBills: {} as Record<string, number>,
        avgValidity: 0
    };
    
    records.forEach(record => {
        stats.channels[record.channel] = (stats.channels[record.channel] || 0) + 1;
        stats.voucherBills[record.voucher_bills] = (stats.voucherBills[record.voucher_bills] || 0) + 1;
        stats.avgValidity += record.validity_days;
    });
    
    stats.avgValidity = Math.round(stats.avgValidity / records.length);
    
    logger.info('');
    logger.info('🌐 Channel Distribution:');
    Object.entries(stats.channels).forEach(([ch, count]) => {
        const pct = Math.round(count / records.length * 100);
        logger.info(`   ${ch.padEnd(15)} ${count.toString().padStart(5)} (${pct}%)`);
    });
    
    logger.info('');
    logger.info('🎫 Voucher Bills Distribution:');
    Object.entries(stats.voucherBills).forEach(([vb, count]) => {
        const pct = Math.round(count / records.length * 100);
        logger.info(`   ${vb.padEnd(15)} ${count.toString().padStart(5)} (${pct}%)`);
    });
    
    logger.info('');
    logger.info(`📅 Average Validity: ${stats.avgValidity} days (~${Math.round(stats.avgValidity/30)} months)`);
    logger.info('═══════════════════════════════════════════════════════════');
}

// ============================================================================
// RUN
// ============================================================================

const csvPath = process.argv[2] || 'data/brand_cache_export.csv';

enhanceBrandData(csvPath).catch(error => {
    logger.error('❌ Error:', error.message);
    process.exit(1);
});
