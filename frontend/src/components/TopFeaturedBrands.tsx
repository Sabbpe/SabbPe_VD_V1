import { useMemo } from "react";
import { useBrands } from "@/hooks/useBrands";
import { adaptBrands } from "@/lib/brandAdapter";

const gradients = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-red-500",
  "from-indigo-500 to-purple-500",
  "from-pink-500 to-rose-500",
];

const getGradientForBrand = (brandName: string) => {
  const index = brandName.charCodeAt(0) % gradients.length;
  return gradients[index];
};

interface TopFeaturedBrandsProps {
  onBrandClick: (slug: string) => void;
}

const TopFeaturedBrands = ({ onBrandClick }: TopFeaturedBrandsProps) => {
  const { data: rawBrands = [], isLoading } = useBrands();
  const brands = useMemo(() => adaptBrands(rawBrands), [rawBrands]);
  
  const featuredBrands = useMemo(() => 
    brands
      .filter(b => b.is_featured)
      .slice(0, 6),
    [brands]
  );

  if (isLoading) {
    return (
      <div className="py-12">
        <h2 className="text-2xl font-bold mb-6">Top Featured Brands</h2>
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (featuredBrands.length === 0) {
    return null;
  }

  return (
    <div className="py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Top Featured Brands</h2>
        <p className="text-muted-foreground">{featuredBrands.length} brands</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {featuredBrands.map((brand) => (
          <div
            key={brand.id}
            onClick={() => onBrandClick(brand.slug)}
            className="group cursor-pointer"
          >
            <div className="aspect-square rounded-xl overflow-hidden mb-3 relative">
              {brand.logo_url ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted p-4 group-hover:scale-105 transition-transform duration-300">
                  <img 
                    src={brand.logo_url} 
                    alt={brand.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradientForBrand(brand.name)} text-white group-hover:scale-105 transition-transform duration-300`}>
                  <span className="text-4xl font-bold drop-shadow-2xl">
                    {brand.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              {brand.discount_percentage > 0 && (
                <div className="absolute top-2 right-2 bg-accent text-white text-xs font-bold px-2 py-1 rounded">
                  {brand.discount_percentage}% OFF
                </div>
              )}
            </div>
            
            <h3 className="font-semibold text-sm text-center group-hover:text-primary transition-colors">
              {brand.name}
            </h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopFeaturedBrands;