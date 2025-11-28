import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CartItem } from "@/types/cart";
import { apiClient } from "@/api/client";

interface CheckoutProps {
  items: CartItem[];
  onClearCart: () => void;
}

interface OrderResponse {
  id: string;
  order_id: string;
  order_status: string;
  items: Array<{
    card_number: string;
    card_pin: string;
    expiry_date: string;
  }>;
}

interface VoucherResult {
  brandName: string;
  denomination: number;
  success: boolean;
  voucher?: {
    cardNumber: string;
    cardPin: string;
    expiryDate: string;
    orderId: string;
  };
  error?: string;
}

const Checkout = ({ items, onClearCart }: CheckoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [purchasedVouchers, setPurchasedVouchers] = useState<VoucherResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const total = items.reduce((sum, item) => {
    const price = item.discount > 0
      ? item.denomination * (1 - item.discount / 100)
      : item.denomination;
    return sum + price;
  }, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const businessName = formData.get('business') as string;
      const email = formData.get('email') as string;
      const phone = formData.get('phone') as string;

      const results: VoucherResult[] = [];

      // Purchase each voucher individually
      for (const item of items) {
        try {
          // Backend handles everything in one call
          const orderResponse = await apiClient.post<OrderResponse>('/orders', {
            brand_code: item.brandId,
            denomination: item.denomination,
            quantity: 1,
            customer_email: email,
            customer_phone: phone,
            customer_name: businessName,
          });

          // Check if order was successful
          if (!orderResponse?.items || orderResponse.items.length === 0) {
            throw new Error('No vouchers returned from order');
          }

          const voucherItem = orderResponse.items[0];

          results.push({
            brandName: item.brandName,
            denomination: item.denomination,
            success: true,
            voucher: {
              cardNumber: voucherItem.card_number,
              cardPin: voucherItem.card_pin,
              expiryDate: voucherItem.expiry_date,
              orderId: orderResponse.order_id,
            },
          });

        } catch (itemError) {
          console.error('Failed to purchase voucher:', itemError);
          results.push({
            brandName: item.brandName,
            denomination: item.denomination,
            success: false,
            error: itemError instanceof Error ? itemError.message : 'Purchase failed',
          });
        }
      }

      // Store results and show them
      setPurchasedVouchers(results);
      setShowResults(true);

      // Check if all succeeded
      const allSucceeded = results.every(r => r.success);
      const successCount = results.filter(r => r.success).length;

      if (allSucceeded) {
        toast({
          title: "All vouchers purchased! 🎉",
          description: `${successCount} voucher(s) purchased successfully.`,
        });
        onClearCart();
      } else {
        toast({
          title: "Partial success",
          description: `${successCount} of ${results.length} voucher(s) purchased.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Purchase failed",
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // If showing results, display voucher details
  if (showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <div className="container py-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shop
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Purchase Complete</CardTitle>
              <CardDescription>
                {purchasedVouchers.filter(v => v.success).length} of {purchasedVouchers.length} vouchers purchased
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {purchasedVouchers.map((result, index) => (
                <Card key={index} className={result.success ? 'border-green-500' : 'border-red-500'}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {result.brandName} - ₹{result.denomination}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.success && result.voucher ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Card Number</p>
                            <p className="font-mono font-bold">{result.voucher.cardNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">PIN</p>
                            <p className="font-mono font-bold">{result.voucher.cardPin}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Expiry Date</p>
                            <p className="font-mono">{result.voucher.expiryDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Order ID</p>
                            <p className="font-mono text-xs">{result.voucher.orderId}</p>
                          </div>
                        </div>
                        <p className="text-sm text-green-600 mt-4">
                          ✓ Voucher details have been sent to your email
                        </p>
                      </div>
                    ) : (
                      <p className="text-red-600">✗ {result.error}</p>
                    )}
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-4">
                <Button onClick={() => navigate('/')} className="flex-1">
                  Continue Shopping
                </Button>
                <Button 
                  onClick={() => navigate('/wallet')} 
                  variant="outline"
                  className="flex-1"
                >
                  View My Wallet
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Original checkout form
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <Button onClick={() => navigate('/')}>
            Browse Vouchers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shop
        </Button>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
                <CardDescription>Enter your details to receive vouchers</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business">Name / Business Name</Label>
                    <Input 
                      id="business" 
                      name="business"
                      placeholder="Your Name or Business" 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      name="email"
                      type="email" 
                      placeholder="your@email.com" 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      name="phone"
                      type="tel" 
                      placeholder="+91 98765 43210" 
                      required 
                    />
                  </div>

                  <Separator />

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Voucher details will be sent to your email immediately after purchase.
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-accent hover:bg-accent/90" 
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing {items.length} voucher(s)...
                      </>
                    ) : (
                      `Purchase ${items.length} Voucher(s) - ₹${total.toFixed(2)}`
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>{items.length} voucher(s)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => {
                  const price = item.discount > 0
                    ? item.denomination * (1 - item.discount / 100)
                    : item.denomination;
                  
                  return (
                    <div key={item.id} className="flex justify-between items-start gap-4">
                      <div className="flex gap-3 flex-1">
                        <div className="h-12 w-12 shrink-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.logoUrl ? (
                            <img src={item.logoUrl} alt={item.brandName} className="w-full h-full object-contain p-1" />
                          ) : (
                            <div className="text-xl font-bold text-primary/20">{item.brandName.charAt(0)}</div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{item.brandName}</p>
                          <p className="text-sm text-muted-foreground">{item.category}</p>
                          <p className="text-xs text-muted-foreground">₹{item.denomination} voucher</p>
                        </div>
                      </div>
                      <p className="font-semibold">₹{price.toFixed(2)}</p>
                    </div>
                  );
                })}

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
