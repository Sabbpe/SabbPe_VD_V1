import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { ComponentBrand, ComponentCategory } from "@/lib/brandAdapter";
import { CartItem } from "@/types/cart";

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

interface VoucherCardProps {
    brand: ComponentBrand;
    category?: ComponentCategory;
    onAddToCart: (item: CartItem) => void;
    onClick: () => void;
}

const VoucherCard = ({ brand, category, onAddToCart, onClick }: VoucherCardProps) => {
    const handleQuickAdd = (e: React.MouseEvent, denomination: number) => {
        e.stopPropagation();

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

        onAddToCart(cartItem);
    };

    return (
        <Card
            className="group hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden h-full flex flex-col"
            onClick={onClick}
        >
            <CardHeader className="p-0">
                <div className="h-32 flex items-center justify-center overflow-hidden relative">
                    {brand.logo_url ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted p-4">
                            <img
                                src={brand.logo_url}
                                alt={brand.name}
                                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                            />
                        </div>
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradientForBrand(brand.name)} text-white`}>
                            <span className="text-4xl font-bold drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">
                                {brand.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}

                    {brand.discount_percentage > 0 && (
                        <Badge className="absolute top-2 right-2 bg-accent text-white text-xs">
                            {brand.discount_percentage}% OFF
                        </Badge>
                    )}

                    {brand.is_featured && (
                        <Badge className="absolute top-2 left-2 bg-primary text-xs">
                            Featured
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-3 flex-1">
                <div className="mb-1.5">
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                        {category?.name || 'Uncategorized'}
                    </Badge>
                </div>

                <h3 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">
                    {brand.name}
                </h3>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {brand.description || 'Exclusive gift vouchers available'}
                </p>
            </CardContent>

            <CardFooter className="p-2 pt-0 flex gap-1.5">
                <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick();
                    }}
                >
                    Details
                </Button>
                <Button
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={(e) => handleQuickAdd(e, 500)}
                >
                    <ShoppingCart className="mr-1 h-3 w-3" />
                    Add
                </Button>
            </CardFooter>
        </Card>
    );
};

export default VoucherCard;
