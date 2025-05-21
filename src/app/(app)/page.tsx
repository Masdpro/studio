
'use client';

import { useState, useMemo } from 'react';
import { ProductCard } from '@/components/products/ProductCard';
import type { Product } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Store } from 'lucide-react'; // Added Store icon

// Enhanced sample product data with more categories and aiHints
const sampleProducts: Product[] = [
  { id: '1', vendorId: 'v1', name: 'Margherita Pizza', description: 'Classic cheese and tomato pizza with a crispy crust.', price: 12.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Pizza', aiHint: 'pizza margherita' },
  { id: '2', vendorId: 'v1', name: 'Pepperoni Passion Pizza', description: 'Loaded with spicy pepperoni and mozzarella cheese.', price: 14.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Pizza', aiHint: 'pizza pepperoni' },
  { id: '3', vendorId: 'v2', name: 'Ultimate Chicken Burger', description: 'Grilled chicken breast, bacon, cheese, lettuce, and tomato.', price: 9.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Burgers', aiHint: 'burger chicken' },
  { id: '4', vendorId: 'v2', name: 'Garden Veggie Burger', description: 'A delicious plant-based patty with fresh garden vegetables.', price: 8.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Burgers', aiHint: 'burger veggie' },
  { id: '5', vendorId: 'v3', name: 'Classic Caesar Salad', description: 'Crisp romaine, Parmesan, croutons, and creamy Caesar dressing.', price: 7.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Salads', aiHint: 'salad caesar' },
  { id: '6', vendorId: 'v3', name: 'Mediterranean Greek Salad', description: 'Tomatoes, cucumbers, olives, feta, and a tangy vinaigrette.', price: 8.49, imageUrl: 'https://placehold.co/600x400.png', category: 'Salads', aiHint: 'salad greek' },
  { id: '7', vendorId: 'v4', name: 'Sparkling Cola', description: 'Classic refreshing cola beverage, chilled to perfection.', price: 2.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Drinks', aiHint: 'drink soda' },
  { id: '8', vendorId: 'v4', name: 'Fresh Orange Juice', description: '100% freshly squeezed orange juice, full of vitamins.', price: 3.00, imageUrl: 'https://placehold.co/600x400.png', category: 'Drinks', aiHint: 'drink juice' },
  { id: '9', vendorId: 'v5', name: 'Decadent Chocolate Cake', description: 'A rich and moist chocolate layer cake with fudge frosting.', price: 5.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Desserts', aiHint: 'dessert cake' },
  { id: '10', vendorId: 'v5', name: 'Vanilla Bean Ice Cream', description: 'Creamy vanilla bean ice cream, perfect for a treat.', price: 3.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Desserts', aiHint: 'dessert icecream' },
  { id: '11', vendorId: 'v1', name: 'Spaghetti Carbonara', description: 'Classic Italian pasta with eggs, cheese, pancetta, and pepper.', price: 13.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Pasta', aiHint: 'pasta carbonara' },
  { id: '12', vendorId: 'v2', name: 'Sushi Platter (from Burger Bonanza? No, a different vendor!)', description: 'Assortment of fresh nigiri and maki rolls.', price: 18.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Sushi', aiHint: 'sushi platter', vendorId: 'v6' }, // Assigning to a new vendor
];

// Mock vendor data for filter display
const sampleVendors: { id: string; name: string }[] = [
  { id: 'v1', name: 'Pizza Place' },
  { id: 'v2', name: 'Burger Bonanza' },
  { id: 'v3', name: 'Salad Supreme' },
  { id: 'v4', name: 'Drinks & Co.' },
  { id: 'v5', name: 'Dessert Dreams' },
  { id: 'v6', name: 'Sushi Central' }, // Added new vendor for Sushi
];


export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedVendor, setSelectedVendor] = useState<string>('All'); // 'All' or vendorId

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(sampleProducts.map(p => p.category).filter(Boolean as any as (value: string | undefined) => value is string))
    ).sort();
    return ['All', ...uniqueCategories];
  }, []);

  const vendorsForFilter = useMemo(() => {
    // Get unique vendor IDs from products that are actually in sampleProducts
    const productVendorIds = Array.from(new Set(sampleProducts.map(p => p.vendorId)));
    // Filter sampleVendors to only include those present in sampleProducts
    const availableVendors = sampleVendors.filter(v => productVendorIds.includes(v.id));
    return [{ id: 'All', name: 'All Vendors' }, ...availableVendors];
  }, []);


  const filteredProducts = useMemo(() => {
    return sampleProducts.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesVendor = selectedVendor === 'All' || product.vendorId === selectedVendor;
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch && matchesVendor;
    });
  }, [searchTerm, selectedCategory, selectedVendor]);

  return (
    <div className="container mx-auto">
      <h1 className="text-4xl font-bold my-10 text-center text-primary">Discover Delicious Foods</h1>

      {/* Search and Filter Section */}
      <div className="mb-10 p-6 bg-card rounded-xl shadow-xl space-y-8">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 w-full h-12 text-base rounded-lg border-border focus:ring-primary focus:border-primary"
          />
        </div>
        
        {/* Category Filters */}
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center text-foreground">
            <Filter className="h-6 w-6 mr-3 text-primary" />
            Filter by Category
          </h3>
          <div className="flex flex-wrap gap-3">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="lg"
                onClick={() => setSelectedCategory(category)}
                className="rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-150 ease-in-out hover:shadow-md focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Vendor Filters */}
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center text-foreground">
            <Store className="h-6 w-6 mr-3 text-primary" />
            Filter by Vendor
          </h3>
          <div className="flex flex-wrap gap-3">
            {vendorsForFilter.map(vendor => (
              <Button
                key={vendor.id}
                variant={selectedVendor === vendor.id ? 'default' : 'outline'}
                size="lg"
                onClick={() => setSelectedVendor(vendor.id)}
                className="rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-150 ease-in-out hover:shadow-md focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {vendor.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-2xl font-semibold text-foreground mb-2">No Products Found</p>
          <p className="text-lg text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}

