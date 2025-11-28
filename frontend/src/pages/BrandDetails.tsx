import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBrand, useVoucherDenominations, useCategories } from "@/hooks/useBrands";
import { adaptBrand, adaptCategories } from "@/lib/brandAdapter";
import { CartItem } from "@/types/cart";
import { useToast } from "@/hooks/use-toast";
import { BrandAmountSelector } from "@/components/BrandAmountSelector";
import { BrandDetailsModal } from "@/components/BrandDetailsModal";

const gradients = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-red-500",
  "from-indigo-500 to-purple-500",
  "from-pink-500 to-rose-500",
  "from-teal-500 to-green-500",
  "from-yellow-500 to-orange-500",
];

const getGradientForBrand = (brandName: string) => {
  const index = brandName.charCodeAt(0) % gradients.length;
  return gradients[index];
};

interface BrandDetailsProps {
  cartItems: CartItem[];
  setCartItems: (items: CartItem[]) => void;
}

const BrandDetails = ({ cartItems, setCartItems }: BrandDetailsProps) => {
  const { brandSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: rawBrand, isLoading: brandLoading } = useBrand(brandSlug || "");
  const brand = useMemo(() => rawBrand ? adaptBrand(rawBrand) : null, [rawBrand]);
  
  const { data: denominations = [], isLoading: denominationsLoading } = useVoucherDenominations(brand?.id || "");
  const { data: rawCategories = [] } = useCategories();
  const categories = useMemo(() => adaptCategories(rawCategories), [rawCategories]);
  
  if (brandLoading || denominationsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Brand not found</h1>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const category = categories.find(c => c.id === brand.category_id);

  const handleAddToCart = (denomination: number) => {
    const cartItem: CartItem = {
      id: `${brand.id}-${denomination}-${Date.now()}`,
      brandId: brand.brand_code,
      brandName: brand.name,
      brandSlug: brand.slug,
      category: category?.name || 'Uncategorized',
      denomination,
      discount: brand.discount_percentage || 0,
      logoUrl: brand.logo_url,
      description: brand.description,
    };
    
    const currentCart = JSON.parse(localStorage.getItem('sabbpe_cart') || '[]');
    currentCart.push(cartItem);
    localStorage.setItem('sabbpe_cart', JSON.stringify(currentCart));
    setCartItems([...cartItems, cartItem]);
    
    toast({
      title: "Added to cart",
      description: `${brand.name} ₹${denomination} voucher added to cart.`,
    });
  };

  const modalBrandData = brand ? {
    id: brand.id,
    brand_name: brand.name,
    brand_code: brand.brand_code || '',
    brand_type: (brand.brand_type || 'Fixed') as 'Fixed' | 'Variable',
    category: category?.name || 'Uncategorized',
    description: brand.description || '',
    brand_image: brand.logo_url || '',
    discount: brand.discount_percentage || 0,
    denomination_list: denominations.map(d => d.value).join(','),
    terms_and_conditions: brand.terms_and_conditions || '{"text":""}',
    redeem_steps: brand.redeem_steps || '[]',
    important_instructions: brand.important_instructions || '[]',
    images: brand.images || '{"raw":""}',
    channel: brand.channel,
    voucher_bills: brand.voucher_bills,
    sub_description: brand.sub_description,
    validity_days: brand.validity_days,
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <Button variant="ghost" className="mb-6" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Store
        </Button>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div>
            <div className="aspect-square rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
              {brand.logo_url ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted p-12">
                  <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradientForBrand(brand.name)} text-white`}>
                  <span className="text-9xl font-bold drop-shadow-2xl">{brand.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <Badge variant="secondary" className="mb-4">{category?.name || 'Uncategorized'}</Badge>
            <h1 className="text-4xl font-bold mb-4">{brand.name}</h1>
            <p className="text-muted-foreground mb-6 text-lg">{brand.description || 'Exclusive gift vouchers'}</p>
            
            <Button variant="outline" className="mb-6 w-full md:w-auto" onClick={() => setModalOpen(true)}>
              <Info className="mr-2 h-4 w-4" />
              View Complete Details
            </Button>
            
            {brand.discount_percentage > 0 && (
              <div className="bg-accent/10 border border-accent rounded-lg p-4 mb-6">
                <p className="text-accent font-bold text-2xl">{brand.discount_percentage}% OFF on all denominations</p>
                <p className="text-sm text-muted-foreground mt-1">Limited time offer</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">About this voucher:</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Valid at all {brand.name} outlets nationwide</li>
                <li>• Can be used {brand.channel || 'online and offline'}</li>
                <li>• Instant digital delivery</li>
                <li>• {brand.gst_status === 'Inclusive' ? 'GST Inclusive' : 'GST Exclusive'}</li>
                {brand.validity_days && <li>• Valid for {brand.validity_days} days (~{Math.round(brand.validity_days/30)} months)</li>}
                {brand.voucher_bills && <li>• {brand.voucher_bills === '1' ? 'One voucher per transaction' : 'Multiple vouchers can be used per transaction'}</li>}
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Choose Denomination</h2>
          {denominations.length === 0 ? (
            <p className="text-muted-foreground">No denominations available at the moment.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {denominations.map((denomination, index) => {
                const finalPrice = brand.discount_percentage > 0
                  ? denomination.value * (1 - brand.discount_percentage / 100)
                  : denomination.value;

                return (
                  <Card key={`${brand.id}-${denomination.value}-${index}`} className="hover:shadow-lg transition-all">
                    <CardHeader>
                      <CardTitle className="text-2xl">₹{denomination.value}</CardTitle>
                      {brand.discount_percentage > 0 && (
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-foreground">₹{finalPrice.toFixed(0)}</p>
                          <p className="text-sm text-muted-foreground line-through">₹{denomination.value}</p>
                        </div>
                      )}
                    </CardHeader>
                    <CardFooter>
                      <Button className="w-full" onClick={() => handleAddToCart(denomination.value)}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Add to Cart
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BrandDetailsModal
        brand={modalBrandData}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onPurchase={(amount) => {
          if (amount > 0) handleAddToCart(amount);
          setModalOpen(false);
        }}
      />
    </div>
  );
};

export default BrandDetails;
