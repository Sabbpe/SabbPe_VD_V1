import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, RefreshCw, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/api/client";

interface Voucher {
  id: string;
  orderId: string;
  brandName: string;
  brandCode: string;
  denomination: number;
  cardNumber: string;
  cardPin: string;
  expiryDate: string;
  status: string;
  purchaseDate: string;
  requestRefNo?: string;
}
interface VoucherValidityResponse {
    status: string;
    balance?: string;
    wallet_balance?: string;
    resultCode: string;
    getMarketingMessage: string;
}
interface VoucherStatus {
  orderId: string;
  status: string;
  balance?: string;
  isActive?: boolean;
  message?: string;
}

const Wallet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
  const [voucherStatuses, setVoucherStatuses] = useState<Record<string, VoucherStatus>>({});
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<Voucher[]>('/orders');
      
      if (response.success && response.data) {
        setVouchers(response.data);
      } else {
        toast({
          title: "Failed to load vouchers",
          description: response.error || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch your vouchers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkVoucherValidity = async (voucher: Voucher) => {
    setCheckingStatus(voucher.id);
    try {
      // Call backend to check EVC status
        const response = await apiClient.post<VoucherValidityResponse>('/valuedesign/get-activated-evc', {
        orderId: voucher.orderId,
        requestRefNo: voucher.requestRefNo || `REQ-${voucher.orderId}`,
      });

      if (response.success) {
        const statusData: VoucherStatus = {
          orderId: voucher.orderId,
          status: response.data.status || 'active',
          balance: response.data.balance || response.data.wallet_balance,
          isActive: response.data.resultCode === '0',
          message: response.data.getMarketingMessage || 'Voucher is valid',
        };

        setVoucherStatuses(prev => ({
          ...prev,
          [voucher.id]: statusData,
        }));

        toast({
          title: "Validity Checked",
          description: statusData.message,
        });
      } else {
        toast({
          title: "Check failed",
          description: response.error || "Could not verify voucher",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check voucher validity",
        variant: "destructive",
      });
    } finally {
      setCheckingStatus(null);
    }
  };

  const togglePinVisibility = (voucherId: string) => {
    setShowPins(prev => ({
      ...prev,
      [voucherId]: !prev[voucherId],
    }));
  };

  const maskPin = (pin: string) => {
    return '****';
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your vouchers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Shop
            </Button>
            <h1 className="text-3xl font-bold">My Wallet</h1>
          </div>
          <Button onClick={fetchVouchers} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {vouchers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">You haven't purchased any vouchers yet</p>
              <Button onClick={() => navigate('/')}>
                Browse Vouchers
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">
                Total: {vouchers.length} voucher(s)
              </p>
            </div>

            {vouchers.map((voucher) => {
              const status = voucherStatuses[voucher.id];
              const isPinVisible = showPins[voucher.id];

              return (
                <Card key={voucher.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{voucher.brandName}</CardTitle>
                        <CardDescription>
                          Purchased on {new Date(voucher.purchaseDate).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-lg font-bold">
                        ₹{voucher.denomination}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Card Number */}
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Card Number</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-muted px-3 py-2 rounded font-mono text-sm">
                            {voucher.cardNumber}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(voucher.cardNumber, 'Card number')}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>

                      {/* PIN */}
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">PIN</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-muted px-3 py-2 rounded font-mono text-sm">
                            {isPinVisible ? voucher.cardPin : maskPin(voucher.cardPin)}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => togglePinVisibility(voucher.id)}
                          >
                            {isPinVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(voucher.cardPin, 'PIN')}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>

                      {/* Expiry Date */}
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Expiry Date</p>
                        <code className="block bg-muted px-3 py-2 rounded font-mono text-sm">
                          {voucher.expiryDate}
                        </code>
                      </div>

                      {/* Order ID */}
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Order ID</p>
                        <code className="block bg-muted px-3 py-2 rounded font-mono text-xs truncate">
                          {voucher.orderId}
                        </code>
                      </div>
                    </div>

                    {/* Status Information */}
                    {status && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <p className="font-semibold">
                              {status.isActive ? '✓ Active' : '✗ Inactive'}
                            </p>
                          </div>
                          {status.balance && (
                            <div>
                              <p className="text-sm text-muted-foreground">Balance</p>
                              <p className="font-semibold">₹{status.balance}</p>
                            </div>
                          )}
                        </div>
                        {status.message && (
                          <p className="text-sm text-muted-foreground mt-2">{status.message}</p>
                        )}
                      </div>
                    )}

                    <Separator />

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => checkVoucherValidity(voucher)}
                        disabled={checkingStatus === voucher.id}
                        variant="outline"
                        className="flex-1"
                      >
                        {checkingStatus === voucher.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Check Validity
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;

