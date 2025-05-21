
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link'; // Import Link
import { ProductCard } from '@/components/products/ProductCard';
import type { Product } from '@/lib/types';
import type { Vendor } from '@/lib/types'; // Import Vendor type
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Store, MapPin, LocateFixed, AlertCircle, ExternalLink } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

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
  { id: '12', vendorId: 'v6', name: 'Sushi Platter', description: 'Assortment of fresh nigiri and maki rolls.', price: 18.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Sushi', aiHint: 'sushi platter' },
];

// Mock vendor data with location tags, coordinates, and external store URLs
const sampleVendors: Vendor[] = [
  { id: 'v1', businessName: 'Pizza Place', streetAddress: '1 Main St', city: 'Pizza City', country: 'Foodland', contactEmail:'v1@example.com', phone:'123', locationTag: 'Downtown', latitude: 34.0522, longitude: -118.2437, externalStoreUrl: 'https://example.com/pizzapalace' },
  { id: 'v2', businessName: 'Burger Bonanza', streetAddress: '2 Burger Ave', city: 'Burger Town', country: 'Foodland', contactEmail:'v2@example.com', phone:'123', locationTag: 'Suburbia', latitude: 34.0000, longitude: -118.3000, externalStoreUrl: 'https://example.com/burgerbonanza' },
  { id: 'v3', businessName: 'Salad Supreme', streetAddress: '3 Salad Rd', city: 'Green Ville', country: 'Foodland', contactEmail:'v3@example.com', phone:'123', locationTag: 'Downtown', latitude: 34.0500, longitude: -118.2400 }, // No external URL
  { id: 'v4', businessName: 'Drinks & Co.', streetAddress: '4 Drink Dr', city: 'Beverage City', country: 'Foodland', contactEmail:'v4@example.com', phone:'123', locationTag: 'Uptown', latitude: 40.7831, longitude: -73.9712, externalStoreUrl: 'https://example.com/drinksco' },
  { id: 'v5', businessName: 'Dessert Dreams', streetAddress: '5 Sweet St', city: 'Cakeburg', country: 'Foodland', contactEmail:'v5@example.com', phone:'123', locationTag: 'Suburbia', latitude: 33.9500, longitude: -118.3500 },
  { id: 'v6', businessName: 'Sushi Central', streetAddress: '6 Fish Ln', city: 'Sushi City', country: 'Foodland', contactEmail:'v6@example.com', phone:'123', locationTag: 'Uptown', latitude: 40.7800, longitude: -73.9700, externalStoreUrl: 'https://example.com/sushicentral' },
];

const USER_CURRENT_LOCATION_VALUE = "user_current_location";
const NEARBY_THRESHOLD_DEGREES = 0.1; // Approx 11km, very rough

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('All'); // Changed to selectedVendorId
  const [selectedLocation, setSelectedLocation] = useState<string>('All Locations');

  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { toast } = useToast();

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(sampleProducts.map(p => p.category).filter(Boolean as any as (value: string | undefined) => value is string))
    ).sort();
    return ['All', ...uniqueCategories];
  }, []);

  const vendorsForFilter = useMemo(() => {
    const productVendorIds = Array.from(new Set(sampleProducts.map(p => p.vendorId)));
    const availableVendors = sampleVendors.filter(v => productVendorIds.includes(v.id));
    // Use a placeholder for "All Vendors" that matches Vendor structure partially
    return [{ id: 'All', businessName: 'All Vendors', locationTag: 'Any', latitude: 0, longitude: 0, streetAddress:'', city:'', country:'', contactEmail:'', phone:'' }, ...availableVendors];
  }, []);

  const locationsForFilter = useMemo(() => {
    const uniqueLocations = Array.from(
      new Set(sampleVendors.map(v => v.locationTag))
    ).filter(Boolean).sort();
    return ['All Locations', USER_CURRENT_LOCATION_VALUE, ...uniqueLocations];
  }, []);

  const handleFetchUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      toast({ title: "Geolocation Error", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    setUserCoords(null); 

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLocating(false);
        toast({ title: "Location Found!", description: "Filtering by your current location."});
      },
      (error) => {
        let message = "Could not retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location permission denied. Please enable it in your browser settings.";
        }
        setLocationError(message);
        setIsLocating(false);
        toast({ title: "Location Error", description: message, variant: "destructive" });
        setSelectedLocation('All Locations'); 
      }
    );
  }, [toast]);

  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
    if (value === USER_CURRENT_LOCATION_VALUE) {
      handleFetchUserLocation();
    } else {
      setUserCoords(null);
      setLocationError(null);
      setIsLocating(false);
    }
  };
  
  const selectedVendorDetails = useMemo(() => {
    return sampleVendors.find(v => v.id === selectedVendorId);
  }, [selectedVendorId]);


  const filteredProducts = useMemo(() => {
    let vendorsToFilterBy = sampleVendors;

    if (selectedLocation === USER_CURRENT_LOCATION_VALUE && userCoords) {
      vendorsToFilterBy = sampleVendors.filter(vendor => 
        Math.abs(vendor.latitude - userCoords.latitude) < NEARBY_THRESHOLD_DEGREES &&
        Math.abs(vendor.longitude - userCoords.longitude) < NEARBY_THRESHOLD_DEGREES
      );
    } else if (selectedLocation !== 'All Locations' && selectedLocation !== USER_CURRENT_LOCATION_VALUE) {
      vendorsToFilterBy = sampleVendors.filter(vendor => vendor.locationTag === selectedLocation);
    }

    const vendorIdsFromLocationFilter = new Set(vendorsToFilterBy.map(v => v.id));

    return sampleProducts.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesVendor = selectedVendorId === 'All' || product.vendorId === selectedVendorId;
      
      let matchesLocationCriteria = false;
      if (selectedLocation === 'All Locations') {
        matchesLocationCriteria = true;
      } else if (selectedLocation === USER_CURRENT_LOCATION_VALUE) {
        matchesLocationCriteria = vendorIdsFromLocationFilter.has(product.vendorId);
      } else {
        matchesLocationCriteria = vendorIdsFromLocationFilter.has(product.vendorId);
      }
      
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
        
      return matchesCategory && matchesSearch && matchesVendor && matchesLocationCriteria;
    });
  }, [searchTerm, selectedCategory, selectedVendorId, selectedLocation, userCoords]);

  return (
    <div className="container mx-auto">
      <h1 className="text-4xl font-bold my-10 text-center text-primary">Discover Delicious Foods</h1>

      <div className="mb-10 p-6 bg-card rounded-xl shadow-xl space-y-8">
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

        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center text-foreground">
              <MapPin className="h-6 w-6 mr-3 text-primary" />
              Filter by Location
            </h3>
            <Select onValueChange={handleLocationChange} value={selectedLocation}>
              <SelectTrigger className="w-full h-12 text-base rounded-lg border-border focus:ring-primary focus:border-primary">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {locationsForFilter.map(location => (
                  <SelectItem key={location} value={location}>
                    {location === USER_CURRENT_LOCATION_VALUE ? (
                      <span className="flex items-center gap-2">
                        <LocateFixed className="h-4 w-4" /> My Current Location
                      </span>
                    ) : location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLocating && <p className="text-sm text-muted-foreground mt-2">Fetching your location...</p>}
            {locationError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Location Error</AlertTitle>
                <AlertDescription>{locationError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold flex items-center text-foreground">
                <Store className="h-6 w-6 mr-3 text-primary" />
                Filter by Vendor
              </h3>
              {selectedVendorDetails && selectedVendorDetails.externalStoreUrl && selectedVendorId !== 'All' && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/vendor/${selectedVendorId}/store`}>
                    Visit {selectedVendorDetails.businessName}'s Site
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
            <Select onValueChange={setSelectedVendorId} value={selectedVendorId}>
              <SelectTrigger className="w-full h-12 text-base rounded-lg border-border focus:ring-primary focus:border-primary">
                <SelectValue placeholder="Select a vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendorsForFilter.map(vendor => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredProducts.map((product) => {
            const vendor = sampleVendors.find(v => v.id === product.vendorId);
            const vendorName = vendor ? vendor.businessName : 'Unknown Vendor';
            return <ProductCard key={product.id} product={product} vendorName={vendorName} />;
          })}
        </div>
      ) : (
         <div className="text-center py-16">
          {isLocating ? (
            <>
              <LocateFixed className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
              <p className="text-2xl font-semibold text-foreground mb-2">Finding nearby products...</p>
              <p className="text-lg text-muted-foreground">
                Please wait while we fetch your location.
              </p>
            </>
          ) : (
            <>
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-2xl font-semibold text-foreground mb-2">No Products Found</p>
              <p className="text-lg text-muted-foreground">
                Try adjusting your search or filter criteria. If filtering by current location, ensure location permissions are enabled and try again.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
