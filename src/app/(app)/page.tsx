'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/product/ProductCard';
import type { Product, Vendor, Market } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Store, MapPin, LocateFixed, AlertCircle, ExternalLink, ArrowLeft, ChevronRight, ShoppingBag } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketCard } from '@/components/market/MarketCard';
import { sampleMarkets, sampleVendors as mockVendors } from '@/lib/mockData';
import placeholderImages from '@/app/lib/placeholder-images.json';

// Enhanced sample product data with centralized images
const sampleProducts: Product[] = [
  // Electronics
  { id: '1', vendorId: 'vendor001', name: 'Wireless Headphones', description: 'High-fidelity wireless headphones with noise cancellation.', price: 149.99, imageUrl: placeholderImages.products.headphones.url, category: 'Electronics', aiHint: placeholderImages.products.headphones.hint },
  { id: '2', vendorId: 'vendor001', name: 'Smartwatch Series X', description: 'Feature-rich smartwatch with health tracking and GPS.', price: 299.50, imageUrl: placeholderImages.products.smartwatch.url, category: 'Electronics', aiHint: placeholderImages.products.smartwatch.hint },
  { id: '11', vendorId: 'vendor001', name: 'Portable Bluetooth Speaker', description: 'Compact and powerful Bluetooth speaker for music on the go.', price: 79.99, imageUrl: placeholderImages.products.speaker.url, category: 'Electronics', aiHint: placeholderImages.products.speaker.hint },
  { id: '20', vendorId: 'vendor001', name: '4K Action Camera', description: 'Rugged 4K action camera for adventure recording.', price: 199.99, imageUrl: placeholderImages.products.camera.url, category: 'Electronics', aiHint: placeholderImages.products.camera.hint },

  // Apparel
  { id: '3', vendorId: 'vendor002', name: 'Organic Cotton T-Shirt', description: 'Comfortable and stylish t-shirt made from 100% organic cotton.', price: 24.99, imageUrl: placeholderImages.products.tshirt.url, category: 'Apparel', aiHint: placeholderImages.products.tshirt.hint },
  { id: '4', vendorId: 'vendor002', name: 'Classic Blue Jeans', description: 'Durable and timeless classic blue jeans for everyday wear.', price: 59.00, imageUrl: placeholderImages.products.jeans.url, category: 'Apparel', aiHint: placeholderImages.products.jeans.hint },
  { id: '15', vendorId: 'vendor002', name: 'Designer Silk Scarf', description: 'Elegant silk scarf with a unique artistic print.', price: 89.00, imageUrl: placeholderImages.products.scarf.url, category: 'Apparel', aiHint: placeholderImages.products.scarf.hint },
  { id: '21', vendorId: 'vendor002', name: 'Running Shoes', description: 'Lightweight and comfortable running shoes for men.', price: 75.00, imageUrl: placeholderImages.products.shoes.url, category: 'Apparel', aiHint: placeholderImages.products.shoes.hint },

  // Books
  { id: '5', vendorId: 'vendor001', name: 'The Mystery of Blackwood Manor', description: 'A thrilling mystery novel set in a secluded English manor.', price: 12.95, imageUrl: placeholderImages.products.mysteryBook.url, category: 'Books', aiHint: placeholderImages.products.mysteryBook.hint },
  { id: '6', vendorId: 'vendor001', name: 'Introduction to Astrophysics', description: 'An accessible guide to the wonders of the cosmos.', price: 18.75, imageUrl: placeholderImages.products.scienceBook.url, category: 'Books', aiHint: placeholderImages.products.scienceBook.hint },

  // Groceries
  { id: '7', vendorId: 'vendor003', name: 'Aromatic Coffee Beans', description: 'Premium whole coffee beans, freshly roasted for rich flavor.', price: 15.99, imageUrl: placeholderImages.products.coffee.url, category: 'Groceries', aiHint: placeholderImages.products.coffee.hint },
  { id: '8', vendorId: 'vendor003', name: 'Artisan Bread Loaf', description: 'Handcrafted sourdough bread with a crispy crust.', price: 6.50, imageUrl: placeholderImages.products.bread.url, category: 'Groceries', aiHint: placeholderImages.products.bread.hint },
  { id: '19', vendorId: 'vendor003', name: 'Organic Olive Oil', description: 'Extra virgin olive oil, cold-pressed, 500ml.', price: 12.75, imageUrl: placeholderImages.products.oliveOil.url, category: 'Groceries', aiHint: placeholderImages.products.oliveOil.hint },
];


const USER_CURRENT_LOCATION_VALUE = "user_current_location";
const ALL_LOCATIONS_VALUE = "All Locations";
const NEARBY_THRESHOLD_DEGREES = 0.1; 

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

  const [activeMarket, setActiveMarket] = useState<Market | null>(null);
  const [activeMarketStore, setActiveMarketStore] = useState<Vendor | null>(null);

  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { toast } = useToast();

  const selectedLocationRef = useRef(selectedLocation);
  const isMounted = useRef(false);

  const [isVendorProfileSheetOpen, setIsVendorProfileSheetOpen] = useState(false);
  const [activeVendorForProfile, setActiveVendorForProfile] = useState<Vendor | null>(null);

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
      new Set(mockVendors.map(v => v.locationTag))
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
    let vendorsFilteredByLocation = mockVendors;

    if (selectedLocation === USER_CURRENT_LOCATION_VALUE && userCoords) {
      vendorsFilteredByLocation = mockVendors.filter(vendor =>
        vendor.latitude && vendor.longitude &&
        Math.abs(vendor.latitude - userCoords.latitude) < NEARBY_THRESHOLD_DEGREES &&
        Math.abs(vendor.longitude - userCoords.longitude) < NEARBY_THRESHOLD_DEGREES
      );
    } else if (selectedLocation !== ALL_LOCATIONS_VALUE && selectedLocation !== USER_CURRENT_LOCATION_VALUE) {
      vendorsFilteredByLocation = mockVendors.filter(vendor => vendor.locationTag === selectedLocation);
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
    return mockVendors.find(v => v.id === selectedVendorId);
  }, [selectedVendorId]);


  const filteredProducts = useMemo(() => {
    let vendorsToFilterBy = mockVendors;

    if (selectedLocation === USER_CURRENT_LOCATION_VALUE && userCoords) {
      vendorsToFilterBy = mockVendors.filter(vendor =>
        vendor.latitude && vendor.longitude &&
        Math.abs(vendor.latitude - userCoords.latitude) < NEARBY_THRESHOLD_DEGREES &&
        Math.abs(vendor.longitude - userCoords.longitude) < NEARBY_THRESHOLD_DEGREES
      );
    } else if (selectedLocation !== ALL_LOCATIONS_VALUE && selectedLocation !== USER_CURRENT_LOCATION_VALUE) {
      vendorsToFilterBy = mockVendors.filter(vendor => vendor.locationTag === selectedLocation);
    }

    const vendorIdsFromLocationFilter = new Set(vendorsToFilterBy.map(v => v.id));

    return sampleProducts.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;

      const matchesVendor = selectedVendorId === 'All' || product.vendorId === selectedVendorId;

      let matchesLocationCriteria = false;
      if (selectedLocation === ALL_LOCATIONS_VALUE ) {
        matchesLocationCriteria = true;
      } else if (selectedLocation === USER_CURRENT_LOCATION_VALUE) {
        if (userCoords) { 
            matchesLocationCriteria = vendorIdsFromLocationFilter.has(product.vendorId);
        } else if (!isLocating && !locationError) { 
            matchesLocationCriteria = true; 
        } else { 
            matchesLocationCriteria = false; 
        }
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

  const filteredMarkets = useMemo(() => {
    return sampleMarkets.filter(market => {
      let matchesLocation = true;
      if (selectedLocation !== ALL_LOCATIONS_VALUE && selectedLocation !== USER_CURRENT_LOCATION_VALUE) {
        matchesLocation = market.locationTag === selectedLocation;
      }
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
                           market.name.toLowerCase().includes(searchLower) || 
                           market.description.toLowerCase().includes(searchLower);
      
      return matchesLocation && matchesSearch;
    });
  }, [searchTerm, selectedLocation]);

  const handleViewVendorProfile = (vendorId: string) => {
    const vendor = mockVendors.find(v => v.id === vendorId);
    if (vendor) {
      setActiveVendorForProfile(vendor);
      setIsVendorProfileSheetOpen(true);
    }
  };

  const renderMarketContent = () => {
    if (activeMarket && activeMarketStore) {
      const storeProducts = sampleProducts.filter(p => p.vendorId === activeMarketStore.id);
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setActiveMarketStore(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Stores
            </Button>
            <div className="flex-grow">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Store className="h-6 w-6 text-primary" />
                {activeMarketStore.businessName}
              </h2>
              <p className="text-muted-foreground">{activeMarketStore.streetAddress}, {activeMarketStore.city}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {storeProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                vendorName={activeMarketStore.businessName}
                vendorStreetAddress={activeMarketStore.streetAddress}
                vendorCity={activeMarketStore.city}
                vendorCountry={activeMarketStore.country}
                onViewVendorProfile={handleViewVendorProfile}
              />
            ))}
          </div>
        </div>
      );
    }

    if (activeMarket) {
      const marketStores = mockVendors.filter(v => v.locationTag === activeMarket.locationTag);
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setActiveMarket(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Markets
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{activeMarket.name}</h2>
              <p className="text-muted-foreground">{activeMarket.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {marketStores.map(store => (
              <Button 
                key={store.id} 
                variant="outline" 
                className="h-auto p-6 flex flex-col items-start gap-2 text-left hover:border-primary transition-all shadow-sm"
                onClick={() => setActiveMarketStore(store)}
              >
                <div className="w-full flex justify-between items-center">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{store.businessName}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{store.operatingHours}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                  <MapPin className="h-3 w-3" />
                  <span>{store.streetAddress}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredMarkets.length > 0 ? (
          filteredMarkets.map(market => {
            const storeCount = mockVendors.filter(v => v.locationTag === market.locationTag).length;
            return (
              <MarketCard 
                key={market.id} 
                market={market} 
                storeCount={storeCount} 
                onClick={(m) => setActiveMarket(m)} 
              />
            );
          })
        ) : (
          <div className="col-span-full text-center py-20">
            <Search className="h-14 w-14 text-muted-foreground/40 mb-4 mx-auto" />
            <p className="text-xl font-semibold mb-2">No markets found</p>
            <p className="text-muted-foreground">Try adjusting your filters.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="products" className="w-full flex flex-col h-full">
        {/* Header Partition */}
        <div className="sticky top-0 z-20 bg-background border-b shadow-sm">
          <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
            <TabsList className="grid w-full max-w-sm grid-cols-2 h-10 p-1 bg-muted rounded-md shrink-0">
              <TabsTrigger value="products" className="text-xs sm:text-sm rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                Browse Products
              </TabsTrigger>
              <TabsTrigger value="markets" className="text-xs sm:text-sm rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Store className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                Local Markets
              </TabsTrigger>
            </TabsList>
            
            <div className="hidden lg:block text-sm text-muted-foreground font-medium truncate">
              Your local neighborhood companion.
            </div>

            <div className="flex items-center gap-2">
            </div>
          </div>
        </div>

        <div className="flex-1 container mx-auto px-4 md:px-6 py-8">
          {/* Shared Filter Block */}
          <div className="mb-10 p-6 bg-card rounded-xl shadow-md border space-y-8">
            <div className="grid md:grid-cols-2 gap-6 items-start">
                <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center text-foreground">
                  <MapPin className="h-5 w-5 mr-2 text-primary" />
                  Filter by Location
                </h3>
                <Select onValueChange={handleLocationChange} value={selectedLocation}>
                  <SelectTrigger className="w-full h-11 rounded-lg border-border focus:ring-primary">
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
                {isLocating && <p className="text-xs text-muted-foreground mt-2">Fetching your location...</p>}
                {locationError && (
                  <Alert variant="destructive" className="mt-2 py-2 px-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-xs">Location Error</AlertTitle>
                    <AlertDescription className="text-xs">{locationError}</AlertDescription>
                  </Alert>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center text-foreground">
                  <Store className="h-5 w-5 mr-2 text-primary" />
                  Filter by Vendor
                </h3>
                  <div className="flex flex-col">
                    <Select onValueChange={setSelectedVendorId} value={selectedVendorId}>
                    <SelectTrigger className="w-full h-11 rounded-lg border-border focus:ring-primary">
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
                        <Button variant="link" size="sm" asChild className="px-0 h-auto">
                        <Link href={`/vendor/${selectedVendorId}/store`}>
                            Visit {selectedVendorDetails.businessName}'s Site
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                        </Button>
                    </div>
                    )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center text-foreground">
                <Filter className="h-5 w-5 mr-2 text-primary" />
                Filter by Category
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="rounded-full px-4"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search products, brands, markets or stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 w-full h-11 rounded-lg border-border focus:ring-primary"
              />
            </div>
          </div>

          <TabsContent value="products" className="mt-0 outline-none">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => {
                  const vendor = mockVendors.find(v => v.id === product.vendorId);
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
               <div className="text-center py-20">
                {isLocating && selectedLocation === USER_CURRENT_LOCATION_VALUE ? (
                  <div className="flex flex-col items-center">
                    <LocateFixed className="h-14 w-14 text-primary/40 mb-4 animate-pulse" />
                    <p className="text-xl font-semibold mb-2">Locating you...</p>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                      Finding the best products nearby.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Search className="h-14 w-14 text-muted-foreground/40 mb-4" />
                    <p className="text-xl font-semibold mb-2">No products found</p>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                      Try adjusting your search or filters to see more results.
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="markets" className="mt-0 outline-none">
            <div className="space-y-8">
              <div className="min-h-[500px]">
                {renderMarketContent()}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

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
