import { useEffect } from 'react';
import { useState } from "react";
import Login from "./pages/Login";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Checkout from "./pages/Checkout";
import BrandDetails from "./pages/BrandDetails";
import Wallet from "./pages/Wallet";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";
import { CartItem } from "./types/cart";

const queryClient = new QueryClient();

const App = () => {
    const [cartItems, setCartItems] = useState<CartItem[]>(() => {
  try {
    const saved = localStorage.getItem('sabbpe_cart');
    console.log('🔄 Loading cart from localStorage:', saved);
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log('🔄 Parsed cart:', parsed);
      return parsed;
    }
  } catch (error) {
    console.error('❌ Failed to load cart:', error);
  }
  console.log('🔄 Starting with empty cart');
  return [];
});

useEffect(() => {
  console.log('💾 Cart state changed:', cartItems);
  console.log('💾 Saving to localStorage...');
  localStorage.setItem('sabbpe_cart', JSON.stringify(cartItems));
  console.log('💾 Saved:', localStorage.getItem('sabbpe_cart'));
}, [cartItems]);

    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <Index
                                    cartItems={cartItems}
                                    setCartItems={setCartItems}
                                />
                            }
                        />
                        <Route
                            path="/brand/:brandSlug"
                            element={
                                <BrandDetails
                                    cartItems={cartItems}
                                    setCartItems={setCartItems}
                                />
                            }
                        />
                        <Route
                            path="/checkout"
                            element={
                                <Checkout
                                    items={cartItems}
                                    onClearCart={() => setCartItems([])}
                                />
                            }
                        />
                        <Route
                            path="/wallet"
                            element={<Wallet />}
                        />
                        <Route
                            path="/login"
                            element={<Login />}
                        />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/refund" element={<Refund />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </BrowserRouter>
            </TooltipProvider>
        </QueryClientProvider>
    );
};

export default App;

