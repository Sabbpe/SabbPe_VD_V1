import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BenefitsSection from "@/components/BenefitsSection";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import VoucherCard from "@/components/VoucherCard";
import Cart from "@/components/Cart";
import Banner from "@/components/Banner";
import TopFeaturedBrands from "@/components/TopFeaturedBrands";
import DealOfTheDay from "@/components/DealOfTheDay";
import Testimonials from "@/components/Testimonials";
import FilterSort, { FilterOptions } from "@/components/FilterSort";
import WalletTopup from "@/components/WalletTopup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBrands, useCategories } from "@/hooks/useBrands";
import { adaptBrands, adaptCategories } from "@/lib/brandAdapter";
import { CartItem } from "@/types/cart";

interface IndexProps {
    cartItems: CartItem[];
    setCartItems: (items: CartItem[]) => void;
}

const Index = ({ cartItems, setCartItems }: IndexProps) => {
    const { user } = useAuth();
    const { wallet, fetchBalance } = useWallet();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isWalletTopupOpen, setIsWalletTopupOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("store");
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState<FilterOptions>({
        priceRange: "all",
        availability: [],
        categories: [],
        minDiscount: 0,
    });
    const [sortBy, setSortBy] = useState("popularity");
    const { toast } = useToast();
    const navigate = useNavigate();

    const { data: rawBrands = [], isLoading: brandsLoading } = useBrands();
    const { data: rawCategories = [] } = useCategories();

    const brands = useMemo(() => adaptBrands(rawBrands), [rawBrands]);
    const categories = useMemo(() => adaptCategories(rawCategories), [rawCategories]);

    const filteredAndSortedBrands = useMemo(() => {
        let filtered = [...brands];

        if (searchQuery.trim()) {
            filtered = filtered.filter(b =>
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (selectedCategory) {
            filtered = filtered.filter(b => b.category_id === selectedCategory);
        } else if (filters.categories.length > 0) {
            filtered = filtered.filter(b => {
                const category = categories.find(c => c.id === b.category_id);
                return category && filters.categories.includes(category.name);
            });
        }

        if (filters.minDiscount > 0) {
            filtered = filtered.filter(b => (b.discount_percentage || 0) >= filters.minDiscount);
        }

        if (filters.priceRange && filters.priceRange !== "all") {
            switch (filters.priceRange) {
                case "0-500":
                    filtered = filtered.filter(b => (b.discount_percentage || 0) <= 15);
                    break;
                case "500-1000":
                    filtered = filtered.filter(b => (b.discount_percentage || 0) > 15 && (b.discount_percentage || 0) <= 25);
                    break;
                case "1000-2500":
                    filtered = filtered.filter(b => (b.discount_percentage || 0) > 25 && (b.discount_percentage || 0) <= 40);
                    break;
                case "2500+":
                    filtered = filtered.filter(b => (b.discount_percentage || 0) > 40);
                    break;
            }
        }

        if (filters.availability.length > 0) {
            if (!filters.availability.includes("online")) {
                filtered = [];
            }
        }

        switch (sortBy) {
            case "discount-high":
                filtered.sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
                break;
            case "discount-low":
                filtered.sort((a, b) => (a.discount_percentage || 0) - (b.discount_percentage || 0));
                break;
            case "price-high":
                filtered.sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
                break;
            case "price-low":
                filtered.sort((a, b) => (a.discount_percentage || 0) - (b.discount_percentage || 0));
                break;
            case "name-asc":
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "name-desc":
                filtered.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case "popularity":
            default:
                filtered.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
                break;
        }

        return filtered;
    }, [brands, categories, selectedCategory, searchQuery, filters, sortBy]);

    const featuredBrands = useMemo(() =>
        brands.filter(b => b.is_featured).slice(0, 6),
        [brands]
    );

    const handleAddToCart = (item: CartItem) => {
        // Check wallet balance before adding to cart
        if (wallet && wallet.balance < 100) {
            toast({
                title: "Low Wallet Balance",
                description: "Please top-up your wallet to purchase vouchers",
                variant: "destructive",
            });
            setIsWalletTopupOpen(true);
            return;
        }

        setCartItems([...cartItems, item]);
        toast({
            title: "Added to cart",
            description: `${item.brandName} voucher has been added to your cart.`,
        });
    };

    const handleRemoveFromCart = (id: string) => {
        setCartItems(cartItems.filter((item) => item.id !== id));
    };

    const handleBrandClick = (slug: string) => {
        navigate(`/brand/${slug}`);
    };

    const handleCategoryClick = (categoryId: string) => {
        if (selectedCategory === categoryId) {
            setSelectedCategory("");
        } else {
            setSelectedCategory(categoryId);
            setFilters(prev => ({ ...prev, categories: [] }));
        }
    };

    const handleFilterChange = (newFilters: FilterOptions) => {
        setFilters(newFilters);
        if (newFilters.categories.length > 0) {
            setSelectedCategory("");
        }
    };

    const availableCategories = categories.map(c => c.name);

    return (
        <div className="min-h-screen bg-background">
            {/* ✅ STICKY HEADER with Email, Wallet, Cart, Logout */}
            <AuthHeader
                cartItemsCount={cartItems.length}
                walletBalance={wallet?.balance}
                onCartClick={() => setIsCartOpen(true)}
                onWalletClick={() => setIsWalletTopupOpen(true)}
            />

            <main className="container py-8">
                {/* CART PANEL */}
                <Cart
                    open={isCartOpen}
                    onOpenChange={setIsCartOpen}
                    items={cartItems}
                    onRemoveItem={(id) => setCartItems(cartItems.filter(item => item.id !== id))}
                    onCheckout={() => { }}
                />

                {/* WALLET TOPUP MODAL */}
                <WalletTopup
                    open={isWalletTopupOpen}
                    onOpenChange={setIsWalletTopupOpen}
                    onSuccess={() => {
                        fetchBalance();
                        toast({
                            title: "Wallet Topped Up",
                            description: "Your wallet has been successfully credited",
                        });
                    }}
                />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
                    <TabsList className="mb-8 w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                        <TabsTrigger value="store" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                            Store
                        </TabsTrigger>
                        <TabsTrigger value="whats-hot" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                            What's Hot
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="store" className="mt-0">
                        <Banner />

                        <div className="relative mb-8">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search for brands, categories..."
                                className="pl-12 h-14 text-lg"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <DealOfTheDay
                            brands={featuredBrands}
                            categories={categories}
                            onBrandClick={handleBrandClick}
                        />

                        <div className="mb-8">
                            <TopFeaturedBrands onBrandClick={handleBrandClick} />
                        </div>
                    </TabsContent>

                    <TabsContent value="whats-hot" className="mt-0">
                        <Banner />
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold mb-4">What's Hot 🔥</h2>
                            <p className="text-muted-foreground mb-6">Top trending gift cards with the best discounts</p>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <aside className="hidden lg:block lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
                            <h3 className="text-base font-bold mb-4 text-gray-900">Filters</h3>
                            <FilterSort
                                variant="sidebar"
                                onFilterChange={handleFilterChange}
                                onSortChange={setSortBy}
                                categories={availableCategories}
                            />
                        </div>
                    </aside>

                    <div className="lg:col-span-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">
                                {activeTab === "whats-hot"
                                    ? "Trending Brands"
                                    : (selectedCategory
                                        ? categories.find(c => c.id === selectedCategory)?.name || "All Brands"
                                        : filters.categories.length > 0
                                            ? `${filters.categories.join(", ")}`
                                            : "All Brands"
                                    )
                                }
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {activeTab === "whats-hot"
                                    ? `${brands.filter(b => b.discount_percentage >= 10).length} brands`
                                    : `${filteredAndSortedBrands.length} brands`
                                }
                            </p>
                        </div>

                        {brandsLoading ? (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">Loading brands...</p>
                            </div>
                        ) : activeTab === "whats-hot" ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {brands
                                    .filter(b => b.discount_percentage >= filters.minDiscount)
                                    .filter(b => filters.categories.length === 0 || filters.categories.includes(categories.find(c => c.id === b.category_id)?.name || ''))
                                    .sort((a, b) => {
                                        switch (sortBy) {
                                            case "discount-high":
                                                return (b.discount_percentage || 0) - (a.discount_percentage || 0);
                                            case "name-asc":
                                                return a.name.localeCompare(b.name);
                                            case "name-desc":
                                                return b.name.localeCompare(a.name);
                                            default:
                                                return (b.discount_percentage || 0) - (a.discount_percentage || 0);
                                        }
                                    })
                                    .slice(0, 12)
                                    .map((brand) => {
                                        const category = categories.find(c => c.id === brand.category_id);
                                        return (
                                            <VoucherCard
                                                key={brand.id}
                                                brand={brand}
                                                category={category}
                                                onAddToCart={handleAddToCart}
                                                onClick={() => handleBrandClick(brand.slug)}
                                            />
                                        );
                                    })}
                            </div>
                        ) : filteredAndSortedBrands.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">No brands found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredAndSortedBrands.map((brand) => {
                                    const category = categories.find(c => c.id === brand.category_id);
                                    return (
                                        <VoucherCard
                                            key={brand.id}
                                            brand={brand}
                                            category={category}
                                            onAddToCart={handleAddToCart}
                                            onClick={() => handleBrandClick(brand.slug)}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-12">
                    <Testimonials />
                </div>

                {/* BENEFITS SECTION */}
                <div className="mt-12">
                    <BenefitsSection />
                </div>
            </main>

            {/* FOOTER */}
            <Footer />

            <Cart
                open={isCartOpen}
                onOpenChange={setIsCartOpen}
                items={cartItems}
                onRemoveItem={handleRemoveFromCart}
                onCheckout={() => setIsCartOpen(false)}
            />
        </div>
    );
};

export default Index;
