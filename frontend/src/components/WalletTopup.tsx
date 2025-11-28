import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';
import { apiClient } from '@/api/client';

interface WalletTopupProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export default function WalletTopup({ open, onOpenChange, onSuccess }: WalletTopupProps) {
    const [amount, setAmount] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('NB');
    const [isLoading, setIsLoading] = useState(false);
    const { fetchBalance } = useWallet();
    const { toast } = useToast();

    const handleTopup = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast({
                title: 'Invalid Amount',
                description: 'Please enter a valid amount',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);

        try {
            // Step 1: Initiate topup
            const topupResponse = await apiClient.post('/wallet/topup', {
                amount: parseFloat(amount),
                paymentMethod: selectedMethod,
            });

            if (!topupResponse.success) {
                throw new Error(topupResponse.error || 'Failed to initiate topup');
            }

            const data = topupResponse.data as Record<string, unknown>;
            const txnId = data.txnId as string;

            toast({
                title: 'Payment Initiated',
                description: `Processing payment for ₹${amount}`,
            });

            // Step 2: For mock payments, simulate callback after 2 seconds
            if (String(data.atomTokenId).startsWith('MOCK')) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Step 3: Call callback endpoint to update wallet
                const callbackResponse = await apiClient.post('/payment/callback', {
                    txnId,
                    amount: parseFloat(amount),
                    status: 'SUCCESS',
                    atomTxnId: data.atomTokenId,
                });

                if (callbackResponse.success) {
                    toast({
                        title: 'Payment Successful! 🎉',
                        description: `Wallet topped up with ₹${amount}`,
                    });

                    // Refresh wallet balance
                    await fetchBalance();

                    setAmount('');
                    onOpenChange(false);
                    onSuccess?.();
                } else {
                    throw new Error('Failed to process payment');
                }
            } else {
                // Real NDPS payment - open payment form
                console.log('Opening NDPS payment form with token:', data.atomTokenId);
                toast({
                    title: 'Redirecting to Payment Gateway',
                    description: 'Complete your payment to top-up wallet',
                });
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Payment failed';
            toast({
                title: 'Error',
                description: errorMsg,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>💰 Top-up Wallet</DialogTitle>
                    <DialogDescription>
                        Add funds to your wallet to purchase vouchers
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Amount Input */}
                    <div className="grid gap-2">
                        <label htmlFor="amount" className="text-sm font-medium">
                            Amount (₹)
                        </label>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={isLoading}
                            min="1"
                            step="100"
                        />
                        <p className="text-xs text-gray-500">Minimum: ₹1</p>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Payment Method</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'NB', label: '🏦 Net Banking', value: 'NB' },
                                { id: 'DC', label: '💳 Debit Card', value: 'DC' },
                                { id: 'UP', label: '📱 UPI', value: 'UP' },
                            ].map((method) => (
                                <button
                                    key={method.id}
                                    onClick={() => setSelectedMethod(method.value)}
                                    disabled={isLoading}
                                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${selectedMethod === method.value
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    {method.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Quick Select</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[500, 1000, 2000, 5000].map((quickAmount) => (
                                <button
                                    key={quickAmount}
                                    onClick={() => setAmount(quickAmount.toString())}
                                    disabled={isLoading}
                                    className="py-2 px-3 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                                >
                                    ₹{quickAmount}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleTopup}
                        disabled={isLoading || !amount}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isLoading ? 'Processing...' : `💳 Pay ₹${amount || '0'}`}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
