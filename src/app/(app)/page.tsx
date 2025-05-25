
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/products/ProductCard';
import type { Product } from '@/lib/types';
import type { Vendor } from '@/lib/types';
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
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { VendorProfileDisplay } from '@/components/vendor/VendorProfileDisplay';

// Enhanced sample product data with more items in all categories
const sampleProducts: Product[] = [
  // Electronics (v1)
  { id: '1', vendorId: 'v1', name: 'Wireless Headphones', description: 'High-fidelity wireless headphones with noise cancellation.', price: 149.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Electronics', aiHint: 'headphones wireless' },
  { id: '2', vendorId: 'v1', name: 'Smartwatch Series X', description: 'Feature-rich smartwatch with health tracking and GPS.', price: 299.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Electronics', aiHint: 'smartwatch modern' },
  { id: '11', vendorId: 'v1', name: 'Portable Bluetooth Speaker', description: 'Compact and powerful Bluetooth speaker for music on the go.', price: 79.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Electronics', aiHint: 'speaker bluetooth' },
  { id: '20', vendorId: 'v1', name: '4K Action Camera', description: 'Rugged 4K action camera for adventure recording.', price: 199.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Electronics', aiHint: 'action camera' },

  // Apparel (v2)
  { id: '3', vendorId: 'v2', name: 'Organic Cotton T-Shirt', description: 'Comfortable and stylish t-shirt made from 100% organic cotton.', price: 24.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Apparel', aiHint: 'shirt cotton' },
  { id: '4', vendorId: 'v2', name: 'Classic Blue Jeans', description: 'Durable and timeless classic blue jeans for everyday wear.', price: 59.00, imageUrl: 'https://placehold.co/600x400.png', category: 'Apparel', aiHint: 'jeans blue' },
  { id: '15', vendorId: 'v2', name: 'Designer Silk Scarf', description: 'Elegant silk scarf with a unique artistic print.', price: 89.00, imageUrl: 'https://placehold.co/600x400.png', category: 'Apparel', aiHint: 'scarf silk' },
  { id: '21', vendorId: 'v2', name: 'Running Shoes', description: 'Lightweight and comfortable running shoes for men.', price: 75.00, imageUrl: 'https://placehold.co/600x400.png', category: 'Apparel', aiHint: 'running shoes' },

  // Books (v3)
  { id: '5', vendorId: 'v3', name: 'The Mystery of Blackwood Manor', description: 'A thrilling mystery novel set in a secluded English manor.', price: 12.95, imageUrl: 'https://placehold.co/600x400.png', category: 'Books', aiHint: 'book novel' },
  { id: '6', vendorId: 'v3', name: 'Introduction to Astrophysics', description: 'An accessible guide to the wonders of the cosmos.', price: 18.75, imageUrl: 'https://placehold.co/600x400.png', category: 'Books', aiHint: 'book science' },
  { id: '16', vendorId: 'v3', name: "Children's Illustrated Storybook", description: 'A beautifully illustrated storybook for young readers.', price: 9.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Books', aiHint: 'kids book' },
  { id: '22', vendorId: 'v3', name: 'Cookbook: Global Flavors', description: 'A cookbook featuring recipes from around the world.', price: 22.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Books', aiHint: 'cookbook recipe' },

  // Groceries (v4)
  { id: '7', vendorId: 'v4', name: 'Aromatic Coffee Beans', description: 'Premium whole coffee beans, freshly roasted for rich flavor.', price: 15.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Groceries', aiHint: 'coffee beans' },
  { id: '8', vendorId: 'v4', name: 'Artisan Bread Loaf', description: 'Handcrafted sourdough bread with a crispy crust.', price: 6.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Groceries', aiHint: 'bread artisan' },
  { id: '19', vendorId: 'v4', name: 'Organic Olive Oil', description: 'Extra virgin olive oil, cold-pressed, 500ml.', price: 12.75, imageUrl: 'https://placehold.co/600x400.png', category: 'Groceries', aiHint: 'olive oil' },
  { id: '23', vendorId: 'v4', name: 'Imported Pasta (Spaghetti)', description: 'Authentic Italian spaghetti, 500g pack.', price: 3.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Groceries', aiHint: 'pasta spaghetti' },
  { id: '24', vendorId: 'v4', name: 'Canned Diced Tomatoes', description: 'Organic diced tomatoes, perfect for sauces. 400g can.', price: 1.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Groceries', aiHint: 'canned tomatoes' },

  // Furniture (v5)
  { id: '9', vendorId: 'v5', name: 'Ergonomic Office Chair', description: 'Comfortable office chair with lumbar support and adjustable height.', price: 250.00, imageUrl: 'https://placehold.co/600x400.png', category: 'Furniture', aiHint: 'chair office' },
  { id: '10', vendorId: 'v5', name: 'Minimalist Desk Lamp', description: 'Sleek LED desk lamp with adjustable brightness.', price: 45.00, imageUrl: 'https://placehold.co/600x400.png', category: 'Furniture', aiHint: 'lamp desk' },
  { id: '18', vendorId: 'v5', name: 'Modern Bookshelf', description: 'Stylish 5-tier bookshelf for living room or office.', price: 89.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Furniture', aiHint: 'bookshelf modern' },
  { id: '25', vendorId: 'v5', name: 'Wooden Coffee Table', description: 'Solid oak coffee table with a rustic finish.', price: 179.00, imageUrl: 'https://placehold.co/600x400.png', category: 'Furniture', aiHint: 'coffee table' },
  { id: '26', vendorId: 'v5', name: 'Adjustable Floor Lamp', description: 'Modern floor lamp with adjustable head and dimmer.', price: 65.00, imageUrl: 'https://placehold.co/600x400.png', category: 'Furniture', aiHint: 'floor lamp' },

  // Sports (v6)
  { id: '12', vendorId: 'v6', name: 'Yoga Mat Premium', description: 'Eco-friendly, non-slip yoga mat for all practice levels.', price: 39.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Sports', aiHint: 'yoga mat' },
  { id: '17', vendorId: 'v6', name: 'Adjustable Dumbbell Set', description: 'Versatile dumbbell set for home workouts, 5-25 lbs.', price: 129.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Sports', aiHint: 'dumbbell set' },
  { id: '27', vendorId: 'v6', name: 'Professional Basketball', description: 'Official size and weight basketball for indoor/outdoor use.', price: 29.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Sports', aiHint: 'basketball sport' },
  { id: '28', vendorId: 'v6', name: 'Resistance Bands Set', description: 'Set of 5 resistance bands for fitness and therapy.', price: 19.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Sports', aiHint: 'resistance bands' },

  // Foods (v4)
  { id: '13', vendorId: 'v4', name: 'Gourmet Pizza Margherita', description: 'Classic Italian pizza with fresh mozzarella and basil.', price: 14.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Foods', aiHint: 'pizza margherita' },
  { id: '14', vendorId: 'v4', name: 'Spicy Chicken Wings (12pcs)', description: 'Crispy chicken wings tossed in a fiery buffalo sauce.', price: 11.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Foods', aiHint: 'chicken wings' },
  { id: '29', vendorId: 'v4', name: 'Fresh Salmon Fillet (1lb)', description: 'Premium quality fresh Atlantic salmon fillet.', price: 18.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Foods', aiHint: 'salmon fillet' },
  { id: '30', vendorId: 'v4', name: 'Organic Berry Mix (Frozen)', description: 'A mix of organic strawberries, blueberries, and raspberries. 10oz.', price: 7.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Foods', aiHint: 'frozen berries' },
];


// Mock vendor data with location tags, coordinates, and external store URLs
const sampleVendors: Vendor[] = [
  { id: 'v1', businessName: 'Tech Gadgets Inc.', streetAddress: '101 Circuit Board Rd', city: 'Techville', country: 'Innovaland', contactEmail:'v1@example.com', phone:'123', locationTag: 'Downtown', latitude: 34.0522, longitude: -118.2437, externalStoreUrl: 'https://example.com/techgadgets', operatingHours: '10 AM - 8 PM, Mon-Sat', status: 'Open' },
  { id: 'v2', businessName: 'Fashion Forward', streetAddress: '202 Style St', city: 'Trend City', country: 'Clothia', contactEmail:'v2@example.com', phone:'123', locationTag: 'Suburbia', latitude: 34.0000, longitude: -118.3000, externalStoreUrl: 'https://example.com/fashionforward', operatingHours: '11 AM - 7 PM, Tue-Sun', status: 'Open' },
  { id: 'v3', businessName: 'The Book Nook', streetAddress: '303 Chapter Ave', city: 'Readington', country: 'Literaria', contactEmail:'v3@example.com', phone:'123', locationTag: 'Downtown', latitude: 34.0500, longitude: -118.2400, operatingHours: '10 AM - 6 PM, Mon-Fri', status: 'Closed' },
  { id: 'v4', businessName: 'Gourmet Pantry & Foods', streetAddress: '404 Flavor Ln', city: 'Foodville', country: 'Delicia', contactEmail:'v4@example.com', phone:'123', locationTag: 'Uptown', latitude: 40.7831, longitude: -73.9712, externalStoreUrl: 'https://example.com/gourmetpantry', operatingHours: '8 AM - 9 PM, Daily', status: 'Open' },
  { id: 'v5', businessName: 'Home Comforts', streetAddress: '505 Cozy Corner', city: 'Furnishtown', country: 'Habitatia', contactEmail:'v5@example.com', phone:'123', locationTag: 'Suburbia', latitude: 33.9500, longitude: -118.3500, operatingHours: '10 AM - 6 PM, Wed-Sun', status: 'Opening Soon' },
  { id: 'v6', businessName: 'Active Life Sports', streetAddress: '606 Fitness Way', city: 'Sportstown', country: 'Energetica', contactEmail:'v6@example.com', phone:'123', locationTag: 'Uptown', latitude: 40.7800, longitude: -73.9700, externalStoreUrl: 'https://example.com/activelife', operatingHours: '9 AM - 8 PM, Daily', status: 'Temporarily Unavailable' },
];


const USER_CURRENT_LOCATION_VALUE = "user_current_location";
const ALL_LOCATIONS_VALUE = "All Locations";
const NEARBY_THRESHOLD_DEGREES = 0.1; // Approx 11km, very rough

const SESSION_STORAGE_KEYS = {
  searchTerm: 'homePageSearchTerm',
  selectedCategory: 'homePageSelectedCategory',
  selectedVendorId: 'homePageSelectedVendorId',
  selectedLocation: 'homePageSelectedLocation',
};

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>(ALL_LOCATIONS_VALUE);

  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { toast } = useToast();

  const selectedLocationRef = useRef(selectedLocation);
  const isMounted = useRef(false);

  const [isVendorProfileSheetOpen, setIsVendorProfileSheetOpen] = useState(false);
  const [activeVendorForProfile, setActiveVendorForProfile] = useState<Vendor | null>(null);

  // Hydrate state from sessionStorage on component mount
  useEffect(() => {
    const storedSearchTerm = sessionStorage.getItem(SESSION_STORAGE_KEYS.searchTerm);
    if (storedSearchTerm !== null) setSearchTerm(storedSearchTerm);

    const storedSelectedCategory = sessionStorage.getItem(SESSION_STORAGE_KEYS.selectedCategory);
    if (storedSelectedCategory) setSelectedCategory(storedSelectedCategory);

    const storedSelectedVendorId = sessionStorage.getItem(SESSION_STORAGE_KEYS.selectedVendorId);
    if (storedSelectedVendorId) setSelectedVendorId(storedSelectedVendorId);

    const storedSelectedLocation = sessionStorage.getItem(SESSION_STORAGE_KEYS.selectedLocation);
    if (storedSelectedLocation) {
      setSelectedLocation(storedSelectedLocation);
      if (storedSelectedLocation !== USER_CURRENT_LOCATION_VALUE) {
        setUserCoords(null);
        setLocationError(null);
        setIsLocating(false);
      }
    } else {
      setSelectedLocation(ALL_LOCATIONS_VALUE);
    }
    isMounted.current = true;
  }, []);

  // Save state to sessionStorage whenever it changes, but only after initial mount
  useEffect(() => {
    if (isMounted.current) {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.searchTerm, searchTerm);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (isMounted.current) {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.selectedCategory, selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (isMounted.current) {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.selectedVendorId, selectedVendorId);
    }
  }, [selectedVendorId]);

  useEffect(() => {
    if (isMounted.current) {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.selectedLocation, selectedLocation);
    }
  }, [selectedLocation]);

  useEffect(() => {
    selectedLocationRef.current = selectedLocation;
  }, [selectedLocation]);


  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(sampleProducts.map(p => p.category).filter(Boolean as any as (value: string | undefined) => value is string))
    ).sort();
    return ['All', ...uniqueCategories];
  }, []);

  const locationsForFilter = useMemo(() => {
    const uniqueLocations = Array.from(
      new Set(sampleVendors.map(v => v.locationTag))
    ).filter(Boolean).sort() as string[];
    return [ALL_LOCATIONS_VALUE, USER_CURRENT_LOCATION_VALUE, ...uniqueLocations];
  }, []);

  const handleFetchUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      toast({ title: "Geolocation Error", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      setIsLocating(false);
      if (selectedLocationRef.current === USER_CURRENT_LOCATION_VALUE) {
          setSelectedLocation(ALL_LOCATIONS_VALUE);
      }
      return;
    }
    setIsLocating(true);
    setLocationError(null);

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
        if (selectedLocationRef.current === USER_CURRENT_LOCATION_VALUE) {
          setSelectedLocation(ALL_LOCATIONS_VALUE);
        }
      }
    );
  }, [toast]);

  useEffect(() => {
    if (isMounted.current) {
      if (selectedLocation === USER_CURRENT_LOCATION_VALUE) {
        handleFetchUserLocation();
      } else {
        setUserCoords(null);
        setLocationError(null);
        setIsLocating(false);
      }
    }
  }, [selectedLocation, handleFetchUserLocation]);


  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
  };

  const vendorsForFilter = useMemo(() => {
    let vendorsFilteredByLocation = sampleVendors;

    if (selectedLocation === USER_CURRENT_LOCATION_VALUE && userCoords) {
      vendorsFilteredByLocation = sampleVendors.filter(vendor =>
        vendor.latitude && vendor.longitude &&
        Math.abs(vendor.latitude - userCoords.latitude) < NEARBY_THRESHOLD_DEGREES &&
        Math.abs(vendor.longitude - userCoords.longitude) < NEARBY_THRESHOLD_DEGREES
      );
    } else if (selectedLocation !== ALL_LOCATIONS_VALUE && selectedLocation !== USER_CURRENT_LOCATION_VALUE) {
      vendorsFilteredByLocation = sampleVendors.filter(vendor => vendor.locationTag === selectedLocation);
    }

    const productVendorIds = Array.from(new Set(sampleProducts.map(p => p.vendorId)));
    const availableVendors = vendorsFilteredByLocation.filter(v => productVendorIds.includes(v.id));

    return [{ id: 'All', businessName: 'All Vendors', locationTag: 'Any', latitude: 0, longitude: 0, streetAddress:'', city:'', country:'', contactEmail:'', phone:'' }, ...availableVendors];
  }, [selectedLocation, userCoords]);

  useEffect(() => {
    if (isMounted.current) {
        if (selectedVendorId !== 'All' && !vendorsForFilter.find(v => v.id === selectedVendorId)) {
          setSelectedVendorId('All');
        }
    }
  }, [vendorsForFilter, selectedVendorId]);


  const selectedVendorDetails = useMemo(() => {
    return sampleVendors.find(v => v.id === selectedVendorId);
  }, [selectedVendorId]);


  const filteredProducts = useMemo(() => {
    let vendorsToFilterBy = sampleVendors;

    if (selectedLocation === USER_CURRENT_LOCATION_VALUE && userCoords) {
      vendorsToFilterBy = sampleVendors.filter(vendor =>
        vendor.latitude && vendor.longitude &&
        Math.abs(vendor.latitude - userCoords.latitude) < NEARBY_THRESHOLD_DEGREES &&
        Math.abs(vendor.longitude - userCoords.longitude) < NEARBY_THRESHOLD_DEGREES
      );
    } else if (selectedLocation !== ALL_LOCATIONS_VALUE && selectedLocation !== USER_CURRENT_LOCATION_VALUE) {
      vendorsToFilterBy = sampleVendors.filter(vendor => vendor.locationTag === selectedLocation);
    }

    const vendorIdsFromLocationFilter = new Set(vendorsToFilterBy.map(v => v.id));

    return sampleProducts.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;

      const matchesVendor = selectedVendorId === 'All' || product.vendorId === selectedVendorId;

      let matchesLocationCriteria = false;
      if (selectedLocation === ALL_LOCATIONS_VALUE || (selectedLocation === USER_CURRENT_LOCATION_VALUE && !userCoords && !locationError && !isLocating) ) {
        matchesLocationCriteria = true;
      } else {
        matchesLocationCriteria = vendorIdsFromLocationFilter.has(product.vendorId);
      }

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === '' ||
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        (product.category && product.category.toLowerCase().includes(searchLower));

      return matchesCategory && matchesSearch && matchesVendor && matchesLocationCriteria;
    });
  }, [searchTerm, selectedCategory, selectedVendorId, selectedLocation, userCoords, locationError, isLocating]);

  const handleViewVendorProfile = (vendorId: string) => {
    const vendor = sampleVendors.find(v => v.id === vendorId);
    if (vendor) {
      setActiveVendorForProfile(vendor);
      setIsVendorProfileSheetOpen(true);
    }
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-4xl font-bold my-10 text-center text-primary">Discover Great Products</h1>

      <div className="mb-10 p-6 bg-card rounded-xl shadow-xl space-y-8">
        <div className="grid md:grid-cols-2 gap-6 items-start">
           <div>
            <h3 className="text-xl font-semibold mb-2 flex items-center text-foreground">
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
            <h3 className="text-xl font-semibold mb-2 flex items-center text-foreground">
              <Store className="h-6 w-6 mr-3 text-primary" />
              Filter by Vendor
            </h3>
             <div className="flex flex-col">
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
                {selectedVendorDetails && selectedVendorDetails.externalStoreUrl && selectedVendorId !== 'All' && (
                <div className="mt-2">
                    <Button variant="outline" size="sm" asChild>
                    <Link href={`/vendor/${selectedVendorId}/store`}>
                        Visit {selectedVendorDetails.businessName}'s Site
                        <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                    </Button>
                </div>
                )}
            </div>
          </div>

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

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search by name, description, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 w-full h-12 text-base rounded-lg border-border focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredProducts.map((product) => {
            const vendor = sampleVendors.find(v => v.id === product.vendorId);
            const vendorName = vendor ? vendor.businessName : 'Unknown Vendor';
            const vendorLocation = vendor ? (vendor.city || vendor.locationTag) : 'Unknown Location';
            const vendorStreetAddress = vendor?.streetAddress || '';
            const vendorCity = vendor?.city || '';
            const vendorCountry = vendor?.country || '';

            return (
              <ProductCard
                key={product.id}
                product={product}
                vendorName={vendorName}
                vendorLocation={vendorLocation}
                vendorStreetAddress={vendorStreetAddress}
                vendorCity={vendorCity}
                vendorCountry={vendorCountry}
                onViewVendorProfile={handleViewVendorProfile}
              />
            );
          })}
        </div>
      ) : (
         <div className="text-center py-16">
          {isLocating && selectedLocation === USER_CURRENT_LOCATION_VALUE ? (
            <>
              <LocateFixed className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
              <p className="text-2xl font-semibold text-foreground mb-2">Finding nearby products...</p>
              <p className="text-lg text-muted-foreground">
                Please wait while we fetch your location. Make sure location permissions are enabled for your browser.
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
      <Sheet open={isVendorProfileSheetOpen} onOpenChange={setIsVendorProfileSheetOpen}>
        <SheetContent className="w-full max-w-md sm:max-w-lg p-0 overflow-y-auto" side="right">
          {activeVendorForProfile && (
            <VendorProfileDisplay vendor={activeVendorForProfile} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
