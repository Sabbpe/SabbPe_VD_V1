import * as Icons from "lucide-react";
import { Card } from "@/components/ui/card";
import { Category } from "@/hooks/useBrands";

interface CategoryIconsProps {
  categories: Category[];
  onCategoryClick: (category: string) => void;
  selectedCategory?: string;
}

const getIconComponent = (iconName: string | null) => {
  if (!iconName) return Icons.Tag;
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.Tag;
};

const getCategoryGradient = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('fashion')) return 'fashion';
  if (name.includes('food') || name.includes('beverage')) return 'food';
  if (name.includes('travel')) return 'travel';
  if (name.includes('entertainment')) return 'entertainment';
  if (name.includes('electronic')) return 'ecommerce';
  if (name.includes('health') || name.includes('wellness')) return 'wellness';
  if (name.includes('home')) return 'ecommerce';
  if (name.includes('book') || name.includes('education')) return 'ecommerce';
  return 'primary';
};

export const CategoryIcons = ({ categories, onCategoryClick, selectedCategory }: CategoryIconsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
      {categories.map((category) => {
        const Icon = getIconComponent(category.icon_name);
        const gradient = getCategoryGradient(category.name);
        const isSelected = selectedCategory === category.name;
        
        return (
          <div
            key={category.id}
            className={`relative group cursor-pointer transition-all duration-500 ${
              isSelected ? "scale-110" : "hover:scale-105"
            }`}
            onClick={() => onCategoryClick(category.name)}
          >
            {/* Glow effect */}
            <div 
              className="absolute inset-0 rounded-2xl opacity-40 group-hover:opacity-80 transition-opacity duration-500 blur-2xl"
              style={{ 
                background: `var(--gradient-${gradient})`,
              }}
            />
            
            {/* Main card with gradient background */}
            <Card
              className={`relative overflow-hidden border-none transition-all duration-500 shadow-lg group-hover:shadow-2xl ${
                isSelected ? "ring-4 ring-white/50" : ""
              }`}
              style={{
                background: `var(--gradient-${gradient})`
              }}
            >
              {/* Animated shine overlay */}
              <div 
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              />
              
              <div className="relative p-8 flex flex-col items-center text-center space-y-3">
                {/* Icon container with glassmorphism */}
                <div className="p-4 rounded-full bg-white/20 backdrop-blur-md border border-white/30 transition-all duration-500 group-hover:bg-white/30 group-hover:scale-110 group-hover:rotate-6">
                  <Icon 
                    className="h-10 w-10 text-white transition-all duration-500 group-hover:scale-110" 
                  />
                </div>
                
                {/* Label */}
                <p className="font-bold text-sm text-white transition-all duration-500 group-hover:scale-105 drop-shadow-md">
                  {category.name}
                </p>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryIcons;
