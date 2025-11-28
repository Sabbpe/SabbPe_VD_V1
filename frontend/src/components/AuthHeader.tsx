import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LogOut, ShoppingCart, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/sabbpe-logo.png';

interface AuthHeaderProps {
    cartItemsCount?: number;
    walletBalance?: number;
    onCartClick?: () => void;
    onWalletClick?: () => void;
}

export default function AuthHeader({
    cartItemsCount = 0,
    walletBalance,
    onCartClick,
    onWalletClick
}: AuthHeaderProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    if (!isHydrated) return null;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b shadow-sm">
            <div className="container mx-auto px-4 py-3">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <img
                            src={logo}
                            alt="SabbPe Logo"
                            className="h-12 w-auto"
                        />
                    </div>

                    {/* Right Side: Email + Wallet + Cart + Logout */}
                    {user && (
                        <div className="flex items-center gap-3">
                            {/* User Email */}
                            <div className="hidden md:block text-right text-xs text-gray-600">
                                <p className="text-gray-500">Welcome</p>
                                <p className="font-semibold">{user.email}</p>
                            </div>

                            {/* Wallet Balance Button */}
                            {walletBalance !== undefined && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onWalletClick}
                                    className="flex items-center gap-2 bg-green-50 border-green-200 hover:bg-green-100"
                                    title="Click to top-up wallet"
                                >
                                    <Wallet className="h-4 w-4 text-green-700" />
                                    <div className="text-left">
                                        <p className="text-[10px] text-gray-600 leading-none">Wallet</p>
                                        <p className="font-semibold text-green-700 text-sm leading-none">
                                            ₹{walletBalance.toFixed(2)}
                                        </p>
                                    </div>
                                </Button>
                            )}

                            {/* Cart Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onCartClick}
                                className="relative"
                                title="Shopping Cart"
                            >
                                <ShoppingCart className="h-4 w-4" />
                                {cartItemsCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                                        {cartItemsCount}
                                    </span>
                                )}
                            </Button>

                            {/* Logout Button */}
                            <Button variant="outline" size="sm" onClick={handleLogout}>
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
