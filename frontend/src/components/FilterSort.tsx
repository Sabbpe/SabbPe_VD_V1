import { useState } from "react";
import { Filter, SortAsc, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export interface FilterOptions {
  priceRange: string;
  availability: string[];
  categories: string[];
  minDiscount: number;
}

export interface SortOption {
  value: string;
  label: string;
}

interface FilterSortProps {
  onFilterChange: (filters: FilterOptions) => void;
  onSortChange: (sort: string) => void;
  categories: string[];
  variant?: "sidebar" | "modal"; // ✅ NEW: Control display mode
}

const priceRanges = [
  { value: "all", label: "All Prices" },
  { value: "0-500", label: "₹0 - ₹500" },
  { value: "500-1000", label: "₹500 - ₹1,000" },
  { value: "1000-2500", label: "₹1,000 - ₹2,500" },
  { value: "2500+", label: "₹2,500+" },
];

const sortOptions: SortOption[] = [
  { value: "popularity", label: "Popularity" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "discount-high", label: "Discount: High to Low" },
  { value: "name-asc", label: "Brand: A to Z" },
  { value: "name-desc", label: "Brand: Z to A" },
];

// ✅ NEW: Reusable filter content component
const FilterContent = ({
  filters,
  sort,
  categories,
  onPriceChange,
  onAvailabilityChange,
  onCategoryChange,
  onDiscountChange,
  onSortChange,
  onReset,
}: unknown) => (
  <div className="space-y-6">
    {/* Categories */}
    <div>
      <h3 className="font-semibold mb-3">Categories</h3>
      <div className="space-y-2">
        {categories.map((category: string) => (
          <div key={category} className="flex items-center space-x-2">
            <Checkbox
              id={`cat-${category}`}
              checked={filters.categories.includes(category)}
              onCheckedChange={(checked) =>
                onCategoryChange(category, checked as boolean)
              }
            />
            <label
              htmlFor={`cat-${category}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {category}
            </label>
          </div>
        ))}
      </div>
    </div>

    <Separator />

    {/* Price Range */}
    <div>
      <h3 className="font-semibold mb-3">Price Range</h3>
      <RadioGroup value={filters.priceRange} onValueChange={onPriceChange}>
        {priceRanges.map((range) => (
          <div key={range.value} className="flex items-center space-x-2">
            <RadioGroupItem value={range.value} id={range.value} />
            <Label htmlFor={range.value} className="cursor-pointer">
              {range.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>

    <Separator />

    {/* Availability */}
    <div>
      <h3 className="font-semibold mb-3">Availability</h3>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="online"
            checked={filters.availability.includes("online")}
            onCheckedChange={(checked) =>
              onAvailabilityChange("online", checked as boolean)
            }
          />
          <label htmlFor="online" className="text-sm cursor-pointer">
            Online
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="offline"
            checked={filters.availability.includes("offline")}
            onCheckedChange={(checked) =>
              onAvailabilityChange("offline", checked as boolean)
            }
          />
          <label htmlFor="offline" className="text-sm cursor-pointer">
            Offline
          </label>
        </div>
      </div>
    </div>

    <Separator />

    {/* Discount */}
    <div>
      <h3 className="font-semibold mb-3">Minimum Discount</h3>
      <RadioGroup
        value={filters.minDiscount.toString()}
        onValueChange={(value) => onDiscountChange(Number(value))}
      >
        {[0, 5, 10, 15, 20].map((discount) => (
          <div key={discount} className="flex items-center space-x-2">
            <RadioGroupItem value={discount.toString()} id={`disc-${discount}`} />
            <Label htmlFor={`disc-${discount}`} className="cursor-pointer">
              {discount === 0 ? "All" : `${discount}% or more`}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>

    <Separator />

    {/* Sort Options */}
    <div>
      <h3 className="font-semibold mb-3">Sort By</h3>
      <RadioGroup value={sort} onValueChange={onSortChange}>
        {sortOptions.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={`sort-${option.value}`} />
            <Label htmlFor={`sort-${option.value}`} className="cursor-pointer">
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>

    <Button onClick={onReset} variant="outline" className="w-full">
      Reset Filters
    </Button>
  </div>
);

const FilterSort = ({
  onFilterChange,
  onSortChange,
  categories = [],
  variant = "sidebar", // ✅ Default to sidebar
}: FilterSortProps) => {
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: "all",
    availability: [],
    categories: [],
    minDiscount: 0,
  });
  const [sort, setSort] = useState("popularity");

  const handlePriceChange = (value: string) => {
    const newFilters = { ...filters, priceRange: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleAvailabilityChange = (value: string, checked: boolean) => {
    const newAvailability = checked
      ? [...filters.availability, value]
      : filters.availability.filter((item) => item !== value);
    const newFilters = { ...filters, availability: newAvailability };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.categories, category]
      : filters.categories.filter((item) => item !== category);
    const newFilters = { ...filters, categories: newCategories };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDiscountChange = (value: number) => {
    const newFilters = { ...filters, minDiscount: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    onSortChange(value);
  };

  const resetFilters = () => {
    const defaultFilters = {
      priceRange: "all",
      availability: [],
      categories: [],
      minDiscount: 0,
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  // ✅ SIDEBAR MODE: Always visible (desktop)
  if (variant === "sidebar") {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 sticky top-24">
        <h3 className="text-lg font-bold mb-6 text-gray-900">Filters & Sort</h3>
        <FilterContent
          filters={filters}
          sort={sort}
          categories={categories}
          onPriceChange={handlePriceChange}
          onAvailabilityChange={handleAvailabilityChange}
          onCategoryChange={handleCategoryChange}
          onDiscountChange={handleDiscountChange}
          onSortChange={handleSortChange}
          onReset={resetFilters}
        />
        {filters.categories.length > 0 && (
          <div className="mt-4 text-xs text-blue-600 bg-blue-50 p-3 rounded">
            {filters.categories.length} category filter(s) applied
          </div>
        )}
      </div>
    );
  }

  // ✅ MODAL MODE: Click to open (mobile)
  return (
    <div className="flex gap-3 mb-6">
      {/* Filter Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filter Options</SheetTitle>
            <SheetDescription>
              Refine your search with filters
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            <FilterContent
              filters={filters}
              sort={sort}
              categories={categories}
              onPriceChange={handlePriceChange}
              onAvailabilityChange={handleAvailabilityChange}
              onCategoryChange={handleCategoryChange}
              onDiscountChange={handleDiscountChange}
              onSortChange={handleSortChange}
              onReset={resetFilters}
            />
          </div>
        </SheetContent>
      </Sheet>

      {filters.categories.length > 0 && (
        <span className="text-sm text-muted-foreground flex items-center">
          {filters.categories.length} filter(s) applied
        </span>
      )}
    </div>
  );
};

export default FilterSort;