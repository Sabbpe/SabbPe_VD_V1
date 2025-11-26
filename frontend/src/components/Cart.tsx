import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, ShoppingBag } from "lucide-react";
import { CartItem, calculateCartSummary, getFinalPrice } from "@/types/cart";

interface CartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export const Cart = ({ open, onOpenChange, items, onRemoveItem, onCheckout }: CartProps) => {
  const navigate = useNavigate();
  const summary = calculateCartSummary(items);

  const handleCheckout = () => {
    onCheckout();
    onOpenChange(false);
    navigate("/checkout");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shopping Cart
          </SheetTitle>
          <SheetDescription>
            {items.length === 0 ? "Your cart is empty" : `${items.length} item${items.length > 1 ? 's' : ''} in cart`}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mb-6">
              Add some vouchers to get started
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {items.map((item) => {
                  const finalPrice = getFinalPrice(item);
                  
                  return (
                    <div
                      key={item.id}
                      className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        {item.logoUrl ? (
                          <img
                            src={item.logoUrl}
                            alt={item.brandName}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div className="text-2xl font-bold text-primary/30">
                            {item.brandName.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{item.brandName}</h4>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            ₹{item.denomination}
                          </span>
                          {item.discount > 0 && (
                            <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded">
                              {item.discount}% OFF
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="text-right">
                          <p className="font-bold">₹{finalPrice.toFixed(0)}</p>
                          {item.discount > 0 && (
                            <p className="text-xs text-muted-foreground line-through">
                              ₹{item.denomination}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{summary.subtotal.toFixed(0)}</span>
                </div>
                {summary.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-accent">-₹{summary.discount.toFixed(0)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₹{summary.total.toFixed(0)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
              >
                Proceed to Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default Cart;