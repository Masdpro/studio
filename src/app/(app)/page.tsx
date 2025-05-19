import { ProductCard } from '@/components/products/ProductCard';
import type { Product } from '@/lib/types';

// Sample product data
const sampleProducts: Product[] = [
  { id: '1', vendorId: 'v1', name: 'Margherita Pizza', description: 'Classic cheese and tomato pizza.', price: 12.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Pizza' },
  { id: '2', vendorId: 'v1', name: 'Pepperoni Pizza', description: 'Pizza with spicy pepperoni topping.', price: 14.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Pizza' },
  { id: '3', vendorId: 'v2', name: 'Chicken Burger', description: 'Grilled chicken breast burger with lettuce and tomato.', price: 9.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Burgers' },
  { id: '4', vendorId: 'v2', name: 'Veggie Burger', description: 'Plant-based patty with fresh vegetables.', price: 8.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Burgers' },
  { id: '5', vendorId: 'v3', name: 'Caesar Salad', description: 'Crisp romaine lettuce, croutons, Parmesan cheese, and Caesar dressing.', price: 7.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Salads' },
  { id: '6', vendorId: 'v3', name: 'Greek Salad', description: 'Tomatoes, cucumbers, olives, feta cheese, and olive oil.', price: 8.49, imageUrl: 'https://placehold.co/600x400.png', category: 'Salads' },
];

export default function HomePage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold my-8 text-center text-primary">Discover Delicious Foods</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sampleProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
