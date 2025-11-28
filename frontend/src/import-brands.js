// import-brands.js - Automated Brand Import Script
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';

// Supabase credentials
const SUPABASE_URL = 'https://grbbtgfvgwxtkgxtakug.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYmJ0Z2Z2Z3d4dGtneHRha3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjEwNjcsImV4cCI6MjA3MjczNzA2N30.WfYhnPAFdBw-WZqZe95qSfk2OD9tUDw_iH9eyxgTjC4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper functions
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
};

const createBrandCode = (name) => {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .substring(0, 15);
};

// Main import function
async function importBrands() {
  try {
    console.log('📊 Reading Excel file...');
    
    // Read Excel file
    const workbook = XLSX.readFile('B2C Margin_V1.xlsx');
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);
    
    console.log(`✅ Found ${data.length} brands to import\n`);
    
    // Process brands
    const brands = data.map((row, index) => {
      const brandName = row['Product Name'];
      const category = row['Category'];
      const discount = row['Offered Disc %'] || 0;
      const brandCode = createBrandCode(brandName);
      const slug = createSlug(brandName);
      
      return {
        brand_code: brandCode,
        brand_name: brandName,
        slug: slug,
        category: category,
        discount: discount,
        is_active: true,
        description: `${brandName} gift vouchers`,
        denomination_list: '[100,250,500,1000,2500,5000]',
        brand_type: discount >= 25 ? 'featured' : null
      };
    });
    
    // Import in chunks of 50
    const chunkSize = 50;
    let imported = 0;
    let errors = 0;
    
    console.log('🚀 Starting import...\n');
    
    for (let i = 0; i < brands.length; i += chunkSize) {
      const chunk = brands.slice(i, i + chunkSize);
      const chunkNumber = Math.floor(i / chunkSize) + 1;
      const totalChunks = Math.ceil(brands.length / chunkSize);
      
      console.log(`📦 Importing chunk ${chunkNumber}/${totalChunks} (${chunk.length} brands)...`);
      
      try {
        const { data: result, error } = await supabase
          .from('brand_cache')
          .upsert(chunk, { 
            onConflict: 'brand_code',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error(`❌ Error in chunk ${chunkNumber}:`, error.message);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          errors += chunk.length;
        } else {
          imported += chunk.length;
          console.log(`✅ Chunk ${chunkNumber} imported successfully`);
        }
      } catch (err) {
        console.error(`❌ Exception in chunk ${chunkNumber}:`, err.message);
        errors += chunk.length;
      }
      
      // Small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 IMPORT COMPLETE!');
    console.log('='.repeat(50));
    console.log(`✅ Successfully imported: ${imported} brands`);
    if (errors > 0) {
      console.log(`⚠️  Errors: ${errors} brands`);
    }
    console.log('='.repeat(50));
    
    // Verify import
    console.log('\n📊 Verifying database...');
    const { count, error: countError } = await supabase
      .from('brand_cache')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`✅ Total brands in database: ${count}`);
    }
    
    // Show category breakdown
    const { data: categories } = await supabase
      .from('brand_cache')
      .select('category')
      .eq('is_active', true);
    
    if (categories) {
      const categoryCounts = categories.reduce((acc, row) => {
        acc[row.category] = (acc[row.category] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📂 Brands per category:');
      Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
          console.log(`  ${cat}: ${count} brands`);
        });
    }
    
    console.log('\n✨ You can now refresh your website to see all brands!\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
console.log('🚀 Brand Import Script');
console.log('='.repeat(50) + '\n');

importBrands()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });