import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Zap, Eye, Gift, Clock, Sparkles, List, Headphones, Heart } from "lucide-react";

const benefits = [
  {
    icon: Zap,
    title: "User-Friendly",
    description: "A smooth and fast digital gifting experience. Buy or redeem on the go and enjoy instant access in just a few easy steps."
  },
  {
    icon: Shield,
    title: "Safe & Secure",
    description: "You don't need to worry about your personal details or voucher balance. Every redemption is securely processed, so your money stays in safe hands."
  },
  {
    icon: Eye,
    title: "Know Before You Spend",
    description: "View your voucher balance, terms, and usage clearly—no hidden surprises. Redeem only when you're satisfied."
  },
  {
    icon: Gift,
    title: "Multiple Usage Options",
    description: "Use your voucher at eligible online and offline acceptance points. Enjoy the freedom to pick where and how you want to spend."
  },
  {
    icon: Clock,
    title: "Instant Delivery",
    description: "No waiting, no shipping. Receive your voucher instantly and use it whenever you need—perfect for last-minute gifting."
  },
  {
    icon: Sparkles,
    title: "Smart & Hassle-Free Gifting",
    description: "Skip the confusion of choosing the \"perfect\" gift. With SabbPe Vouchers, the receiver selects what they truly want."
  },
  {
    icon: List,
    title: "All in One Place",
    description: "Track your vouchers, redemption history, and remaining balance easily—everything stays organized and accessible."
  },
  {
    icon: Headphones,
    title: "Reliable Support",
    description: "For any questions around voucher usage or redemption, SabbPe support is ready to help you with a smooth experience."
  },
  {
    icon: Heart,
    title: "Always a Great Choice",
    description: "Festivals, celebrations, birthdays, rewards, or surprises—SabbPe Gift Vouchers make every occasion effortless and delightful."
  }
];

const BenefitsSection = () => {
  return (
    <div className="mb-12 mt-16">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3">Benefits of Using SabbPe Gift Vouchers</h2>
        <p className="text-muted-foreground">Experience the best in digital gifting</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow border-2">
              <CardHeader>
                <div className="mb-3 flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {benefit.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BenefitsSection;

