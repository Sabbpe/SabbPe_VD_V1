import pandas as pd

# Read Excel
df = pd.read_excel('B2C Margin_V1.xlsx')

print(f"📊 Total rows in Excel: {len(df)}")

# Remove duplicates based on Product Name (keep first occurrence)
df_unique = df.drop_duplicates(subset=['Product Name'], keep='first')

print(f"✅ Unique brands after deduplication: {len(df_unique)}")
print(f"⚠️  Removed {len(df) - len(df_unique)} duplicates\n")

# Generate SQL
sql = "-- INSERT UNIQUE BRANDS ONLY\n\n"
sql += "-- First, clear existing test data\n"
sql += "DELETE FROM public.brand_cache WHERE brand_code IN ('APOLLO', 'KFC', 'AMAZON', 'MYNTRA', 'BOOKMYSHOW', 'PIZZA', 'COSTA', 'DERMA', 'HEALTH', 'FLIPKART');\n\n"
sql += "INSERT INTO public.brand_cache (brand_code, brand_name, slug, category, discount, is_active, description, denomination_list, brand_type)\nVALUES\n"

rows = []
for idx, row in df_unique.iterrows():
    brand_name = str(row['Product Name']).replace("'", "''")
    category = str(row['Category']).replace("'", "''")
    discount = float(row['Offered Disc %']) if pd.notna(row['Offered Disc %']) else 0
    
    # Generate brand_code and slug
    brand_code = brand_name.upper().replace(' ', '').replace('&', '').replace('-', '').replace("'", '').replace('.', '')[:15]
    slug = brand_name.lower().replace(' ', '-').replace('&', 'and').replace("'", '').replace('.', '')[:100]
    
    # Determine if featured
    brand_type = "'featured'" if discount >= 25 else "null"
    
    row_sql = f"  ('{brand_code}', '{brand_name}', '{slug}', '{category}', {discount}, true, '{brand_name} gift vouchers', '[100,250,500,1000,2500,5000]', {brand_type})"
    rows.append(row_sql)

sql += ',\n'.join(rows)
sql += "\nON CONFLICT (brand_code) DO NOTHING;\n"  # Changed to DO NOTHING to skip conflicts
sql += "\n-- Verify import\n"
sql += "SELECT COUNT(*) as total_brands FROM public.brand_cache;\n"

# Save to file
with open('import_all_brands.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print(f"✅ Generated SQL file!")
print("📝 File: import_all_brands.sql")
print("\n🚀 Run this in Supabase SQL Editor")