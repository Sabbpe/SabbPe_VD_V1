import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    id: 1,
    name: "Rajesh Kumar",
    role: "Business Owner",
    content: "Amazing discounts on premium brands! I've saved thousands using VoucherHub for my business gifting needs.",
    rating: 5,
    avatar: "RK"
  },
  {
    id: 2,
    name: "Priya Sharma",
    role: "HR Manager",
    content: "The variety of vouchers is impressive. Perfect for employee rewards and client appreciation gifts.",
    rating: 5,
    avatar: "PS"
  },
  {
    id: 3,
    name: "Amit Patel",
    role: "Retail Merchant",
    content: "Fast delivery and excellent customer service. This platform has made bulk voucher purchasing so easy!",
    rating: 5,
    avatar: "AP"
  }
];

const Testimonials = () => {
  return (
    <div className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">What Our Merchants Say</h2>
        <p className="text-muted-foreground">Trusted by thousands of businesses across India</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6 italic">"{testimonial.content}"</p>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {testimonial.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Testimonials;
