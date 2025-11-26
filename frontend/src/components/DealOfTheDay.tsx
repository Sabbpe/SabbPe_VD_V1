import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";
import { ComponentBrand, ComponentCategory } from "@/lib/brandAdapter";
import { useMemo } from "react";

const gradients = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-red-500",
];

const getGradientForBrand = (brandName: string) => {
  const index = brandName.charCodeAt(0) % gradients.length;
  return gradients[index];
};

interface DealOfTheDayProps {
  brands: ComponentBrand[];
  categories: ComponentCategory[];
  onBrandClick: (slug: string) => void;
}

const DealOfTheDay = ({ brands, categories, onBrandClick }: DealOfTheDayProps) => {
  // Get the brand with highest discount
  const dealBrand = useMemo(() => {
    if (brands.length === 0) return null;
    return brands.reduce((prev, current) => 
      (current.discount_percentage > prev.discount_percentage) ? current : prev
    );
  }, [brands]);

  if (!dealBrand || dealBrand.discount_percentage === 0) {
    return null;
  }

  const category = categories.find(c => c.id === dealBrand.category_id);

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="h-6 w-6 text-accent animate-pulse" />
        <h2 className="text-2xl font-bold">Deal of the Day</h2>
        <Badge variant="destructive" className="animate-bounce">
          Limited Time
        </Badge>
      </div>

      <Card className="overflow-hidden border-2 border-accent/50 hover:border-accent transition-all">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image Section */}
            <div className="relative aspect-square md:aspect-auto">
              {dealBrand.logo_url ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted p-12">
                  <img 
                    src={dealBrand.logo_url} 
                    alt={dealBrand.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradientForBrand(dealBrand.name)} text-white`}>
                  <span className="text-9xl font-bold drop-shadow-2xl">
                    {dealBrand.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <div className="absolute top-6 left-6">
                <Badge variant="secondary">{category?.name || 'Featured'}</Badge>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-8 flex flex-col justify-center">
              <div className="mb-4">
                <div className="inline-block bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  🔥 Hottest Deal Today
                </div>
                <h3 className="text-4xl font-bold mb-3">{dealBrand.name}</h3>
                <p className="text-muted-foreground text-lg mb-6">
                  {dealBrand.description || 'Exclusive gift vouchers with amazing discounts'}
                </p>
              </div>

              <div className="bg-accent/10 border-2 border-accent rounded-xl p-6 mb-6">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-6xl font-bold text-accent">
                    {dealBrand.discount_percentage}%
                  </span>
                  <span className="text-2xl font-semibold text-muted-foreground">OFF</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Save big on all denominations
                </p>
              </div>

              <div className="space-y-3 mb-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Valid at all outlets nationwide</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Instant digital delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>No hidden charges</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full bg-accent hover:bg-accent/90"
                onClick={() => onBrandClick(dealBrand.slug)}
              >
                Grab This Deal
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DealOfTheDay;