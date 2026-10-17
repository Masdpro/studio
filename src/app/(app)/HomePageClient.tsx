
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { track } from '@/lib/track';
import { ProductCard } from '@/components/product/ProductCard';
import { FlashDealCard } from '@/components/product/FlashDealCard';
import type { Product, Vendor, Market, VendorBranch } from '@/lib/types';
import { vendorInLocation, vendorMatchesQuery } from '@/lib/vendor-search';
import { getSavedAddress, saveAddress, getAddressHistory, rememberAddress, forgetAddress, type SavedAddress } from '@/lib/delivery-address';
import { LocationCombobox } from '@/components/home/LocationCombobox';
import { VendorResultCard } from '@/components/vendor/VendorResultCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Store, MapPin, LocateFixed, AlertCircle, ExternalLink, ShoppingBag, Zap, Flame, Smartphone, Apple } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useRouter, useSearchParams } from 'next/navigation';
import { parseHomeView } from '@/components/layout/HomeViewTabs';
import { FitChips } from '@/components/home/FitChips';
import { MarketCard } from '@/components/market/MarketCard';
// Data now comes from the database (via src/lib/services) and is fetched
// server-side in page.tsx, then handed to this client component as props.
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const USER_CURRENT_LOCATION_VALUE = "user_current_location";
const CUSTOM_ADDRESS_VALUE = "custom_address";
const ALL_LOCATIONS_VALUE = "All Locations";
const NEARBY_THRESHOLD_DEGREES = 0.1; 

const SESSION_STORAGE_KEYS = {
  searchTerm: 'homePageSearchTerm',
  selectedCategory: 'homePageSelectedCategory',
  selectedVendorId: 'homePageSelectedVendorId',
  selectedLocation: 'homePageSelectedLocation',
};

interface HomePageClientProps {
  initialProducts: Product[];
  initialVendors: Vendor[];
  initialMarkets: Market[];
  initialBranches?: VendorBranch[];
}

export default function HomePageClient({
  initialProducts: sampleProducts,
  initialVendors: mockVendors,
  initialMarkets: sampleMarkets,
  initialBranches = [],
}: HomePageClientProps) {
  // Products / Markets is switched from the header (see HomeViewTabs) via ?view=
  const activeView = parseHomeView(useSearchParams().get('view'));
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>(ALL_LOCATIONS_VALUE);

  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  // A specific address typed into the location filter (also pre-fills the delivery address at checkout).
  const [addressHistory, setAddressHistory] = useState<SavedAddress[]>([]);
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [customCoords, setCustomCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [addressNote, setAddressNote] = useState<string | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  // "My Current Location" is offered as a suggestion to confirm, like a typed address.
  const [detected, setDetected] = useState<SavedAddress | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const { toast } = useToast();

  const selectedLocationRef = useRef(selectedLocation);
  const applyAddressRef = useRef<((a: SavedAddress) => void) | null>(null);
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

    const saved = getSavedAddress();
    setAddressHistory(getAddressHistory());
    let storedSelectedLocation = sessionStorage.getItem(SESSION_STORAGE_KEYS.selectedLocation);
    if (storedSelectedLocation === USER_CURRENT_LOCATION_VALUE) storedSelectedLocation = null;
    if (storedSelectedLocation === CUSTOM_ADDRESS_VALUE) {
      if (saved) {
        setActiveAddress(saved.address);
        setCustomCoords(saved.latitude !== undefined && saved.longitude !== undefined ? { latitude: saved.latitude, longitude: saved.longitude } : null);
      } else storedSelectedLocation = null;
    }
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

  // Record what people search for (debounced, so typing doesn't spam events).
  useEffect(() => {
    const term = searchTerm.trim();
    if (!isMounted.current || term.length < 2) return;
    const t = setTimeout(() => track('search', { term }), 1000);
    return () => clearTimeout(t);
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


  // Quick filters: most-ordered categories first (refreshed on load); unordered ones follow alphabetically.
  const [popularCategories, setPopularCategories] = useState<string[]>([]);
  useEffect(() => {
    fetch('/api/categories/popular')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.categories) setPopularCategories(d.categories); })
      .catch(() => {});
  }, []);
  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(sampleProducts.map(p => p.category).filter(Boolean as any as (value: string | undefined) => value is string))
    ).sort();
    const rank = (c: string) => { const i = popularCategories.indexOf(c); return i === -1 ? Infinity : i; };
    return ['All', ...unique.sort((a, b) => rank(a) - rank(b))];
  }, [sampleProducts, popularCategories]);

  const branchesByVendor = useMemo(() => {
    const m = new Map<string, VendorBranch[]>();
    initialBranches.forEach(b => m.set(b.vendorId, [...(m.get(b.vendorId) ?? []), b]));
    return m;
  }, [initialBranches]);
  const locationFilter = (): { value: string; all: string; current: string; coords: { latitude: number; longitude: number } | null } =>
    selectedLocation === CUSTOM_ADDRESS_VALUE
      ? { value: USER_CURRENT_LOCATION_VALUE, all: ALL_LOCATIONS_VALUE, current: USER_CURRENT_LOCATION_VALUE, coords: customCoords }
      : { value: selectedLocation, all: ALL_LOCATIONS_VALUE, current: USER_CURRENT_LOCATION_VALUE, coords: userCoords };

  const locationsForFilter = useMemo(() => {
    const uniqueLocations = Array.from(
      new Set([...mockVendors.map(v => v.locationTag), ...initialBranches.map(b => b.locationTag)])
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
    setResolvedAddress(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ latitude, longitude });
        setIsLocating(false);
        toast({ title: "Location Found!", description: "Filtering by your current location."});

        fetch(`/api/geocode/reverse?lat=${latitude}&lon=${longitude}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            const addr: string | null = data?.address ?? null;
            setResolvedAddress(addr);
            // Show the resolved street address in the same field/list as typed addresses (and use it at checkout).
            // If the street lookup fails, fall back to the coordinates so the location still appears.
            const label = addr ?? `Current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
            if (selectedLocationRef.current === USER_CURRENT_LOCATION_VALUE) applyAddressRef.current?.({ address: label, latitude, longitude });
          })
          .catch(() => {
            setResolvedAddress(null);
            if (selectedLocationRef.current === USER_CURRENT_LOCATION_VALUE) {
              applyAddressRef.current?.({ address: `Current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, latitude, longitude });
            }
          });
      },
      (error) => {
        let message = "Could not retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location permission denied. Please enable it in your browser settings.";
        }
        setLocationError(message);
        setIsLocating(false);
        setResolvedAddress(null);
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
        setResolvedAddress(null);
      }
    }
  }, [selectedLocation, handleFetchUserLocation]);


  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
    // Leaving the address option means checkout should no longer pre-fill it.
    setActiveAddress(null);
    setAddressNote(null);
    saveAddress(null);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { setDetectError('Geolocation is not supported by your browser.'); return; }
    setDetecting(true);
    setDetectError(null);
    setDetected(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        let address: string | null = null;
        try {
          const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lon=${longitude}`);
          if (res.ok) address = (await res.json()).address ?? null;
        } catch { /* fall back to coordinates below */ }
        setDetected({ address: address ?? `Current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, latitude, longitude });
        setDetecting(false);
      },
      (error) => {
        setDetecting(false);
        setDetectError(error.code === error.PERMISSION_DENIED ? 'Location permission denied. Please enable it in your browser settings.' : 'Could not retrieve your location.');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const applyAddress = (a: SavedAddress) => {
    const coords = a.latitude !== undefined && a.longitude !== undefined ? { latitude: a.latitude, longitude: a.longitude } : null;
    setCustomCoords(coords);
    setActiveAddress(a.address);
    setSelectedLocation(CUSTOM_ADDRESS_VALUE);
    saveAddress(a);
    setAddressHistory(rememberAddress(a));
    setAddressNote(coords ? null : "We couldn't place that address on the map, so vendors aren't filtered by it. It will still be used for delivery at checkout.");
  };

  applyAddressRef.current = applyAddress;

  const submitAddress = async (address: string) => {
    setIsResolvingAddress(true);
    let coords: { latitude: number; longitude: number } | null = null;
    try {
      const res = await fetch(`/api/geocode/forward?address=${encodeURIComponent(address)}`);
      if (res.ok) coords = await res.json();
    } catch { /* offline: handled as unmapped */ }
    setIsResolvingAddress(false);
    applyAddress({ address, ...(coords ?? {}) });
    if (coords) toast({ title: 'Address set', description: 'Showing vendors near it. It will be used at checkout.' });
  };

  const vendorsForFilter = useMemo(() => {
    const vendorsFilteredByLocation = mockVendors.filter(v => vendorInLocation(v, branchesByVendor.get(v.id) ?? [], locationFilter()));

    const productVendorIds = Array.from(new Set(sampleProducts.map(p => p.vendorId)));
    const availableVendors = vendorsFilteredByLocation.filter(v => productVendorIds.includes(v.id));

    return [{ id: 'All', businessName: 'All Vendors', locationTag: 'Any', latitude: 0, longitude: 0, streetAddress:'', city:'', country:'', contactEmail:'', phone:'' }, ...availableVendors];
  }, [selectedLocation, userCoords, customCoords]);

  useEffect(() => {
    if (isMounted.current) {
        if (selectedVendorId !== 'All' && !vendorsForFilter.find(v => v.id === selectedVendorId)) {
          setSelectedVendorId('All');
        }
    }
  }, [vendorsForFilter, selectedVendorId]);


  // Vendors shown in the filter: on the Markets view, every store that sits inside a market.
  const vendorOptions = useMemo(() => {
    if (activeView !== 'markets') return vendorsForFilter;
    const inMarkets = mockVendors.filter(
      v => v.marketId && (selectedLocation === USER_CURRENT_LOCATION_VALUE || vendorInLocation(v, branchesByVendor.get(v.id) ?? [], locationFilter()))
    );
    return [vendorsForFilter[0], ...inMarkets];
  }, [activeView, vendorsForFilter, selectedLocation]);

  // Markets view: picking a vendor opens the market that holds the store, on that store's page.
  const handleVendorChange = (vendorId: string) => {
    if (activeView === 'markets' && vendorId !== 'All') {
      const vendor = mockVendors.find(v => v.id === vendorId);
      if (vendor?.marketId) {
        router.push(`/market/${vendor.marketId}/vendor/${vendor.id}`);
        return;
      }
    }
    setSelectedVendorId(vendorId);
  };

  // The search box also matches vendors (store name, city, street address).
  const vendorTextMatches = (v: Vendor, q: string) => vendorMatchesQuery(v, branchesByVendor.get(v.id) ?? [], q);
  const vendorMatchesSearch = (vendorId: string, q: string) => {
    const v = mockVendors.find(x => x.id === vendorId);
    return !!v && vendorTextMatches(v, q);
  };

  // Stores whose name or any branch matches the search — shown as store cards that open the vendor's page.
  const matchedStores = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return mockVendors
      .filter(v => vendorTextMatches(v, q) && vendorInLocation(v, branchesByVendor.get(v.id) ?? [], locationFilter()))
      .sort((a, b) => Number(b.businessName.toLowerCase().includes(q)) - Number(a.businessName.toLowerCase().includes(q)) || a.businessName.localeCompare(b.businessName))
      .slice(0, 12);
  }, [searchTerm, selectedLocation, userCoords, initialBranches]);
  const productCountByVendor = useMemo(() => {
    const m = new Map<string, number>();
    sampleProducts.forEach(p => m.set(p.vendorId, (m.get(p.vendorId) ?? 0) + 1));
    return m;
  }, []);
  const storesSection = matchedStores.length > 0 && (
    <section>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Store className="h-6 w-6 text-primary" />
        Stores
        <span className="text-base font-normal text-muted-foreground">({matchedStores.length})</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matchedStores.map(v => (
          <VendorResultCard
            key={v.id}
            vendor={v}
            branches={branchesByVendor.get(v.id) ?? []}
            productCount={productCountByVendor.get(v.id) ?? 0}
            marketName={v.marketId ? sampleMarkets.find(m => m.id === v.marketId)?.name : undefined}
          />
        ))}
      </div>
    </section>
  );

  const selectedVendorDetails = useMemo(() => {
    return mockVendors.find(v => v.id === selectedVendorId);
  }, [selectedVendorId]);


  const filteredProducts = useMemo(() => {
    const vendorsToFilterBy = mockVendors.filter(v => vendorInLocation(v, branchesByVendor.get(v.id) ?? [], locationFilter()));

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
        (product.category && product.category.toLowerCase().includes(searchLower)) ||
        vendorMatchesSearch(product.vendorId, searchLower);

      return matchesCategory && matchesSearch && matchesVendor && matchesLocationCriteria;
    });
  }, [searchTerm, selectedCategory, selectedVendorId, selectedLocation, userCoords, locationError, isLocating, initialBranches]);

  const flashDeals = useMemo(() => {
    return sampleProducts.filter(p => p.isAwoof);
  }, []);

  const filteredMarkets = useMemo(() => {
    return sampleMarkets.filter(market => {
      let matchesLocation = true;
      if (selectedLocation !== ALL_LOCATIONS_VALUE && selectedLocation !== USER_CURRENT_LOCATION_VALUE) {
        matchesLocation = market.locationTag === selectedLocation;
      }
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
                           market.name.toLowerCase().includes(searchLower) || 
                           market.description.toLowerCase().includes(searchLower) ||
                           mockVendors.some(v => v.marketId === market.id && vendorTextMatches(v, searchLower));
      
      return matchesLocation && matchesSearch;
    });
  }, [searchTerm, selectedLocation]);

  const trendingMarkets = useMemo(() => {
    return sampleMarkets.filter(m => m.isTrending);
  }, []);

  const handleViewVendorProfile = (vendorId: string) => {
    const vendor = mockVendors.find(v => v.id === vendorId);
    if (vendor) {
      setActiveVendorForProfile(vendor);
      setIsVendorProfileSheetOpen(true);
    }
  };

  const renderMarketContent = () => {
    return (
      <div className="space-y-10">
        {storesSection}
        {/* Trending Markets Spotlight */}
        {trendingMarkets.length > 0 && searchTerm === '' && selectedLocation === ALL_LOCATIONS_VALUE && (
           <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              Trending Markets
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {trendingMarkets.map(market => {
                const storeCount = mockVendors.filter(v => v.marketId === market.id).length;
                return <MarketCard key={market.id} market={market} storeCount={storeCount} />;
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            {selectedLocation === ALL_LOCATIONS_VALUE ? 'All Local Markets' : `Markets in ${selectedLocation}`}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMarkets.length > 0 ? (
              filteredMarkets.map(market => {
                const storeCount = mockVendors.filter(v => v.marketId === market.id).length;
                return <MarketCard key={market.id} market={market} storeCount={storeCount} />;
              })
            ) : (
              <div className="col-span-full text-center py-20">
                <Search className="h-14 w-14 text-muted-foreground/40 mb-4 mx-auto" />
                <p className="text-xl font-semibold mb-2">No markets found</p>
                <p className="text-muted-foreground">Try adjusting your filters.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeView} className="w-full flex flex-col h-full">
        <div className="flex-1 container mx-auto px-4 md:px-6 pt-2 pb-8 md:pt-3">
          {/* Shared Filter Block */}
          <div className="mb-8 p-4 md:p-5 bg-card rounded-xl shadow-md border space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] items-start">
                <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center text-foreground">
                  <MapPin className="h-4 w-4 mr-2 text-primary" />
                  Filter by City/Area
                </h3>
                <LocationCombobox
                  areas={locationsForFilter}
                  allValue={ALL_LOCATIONS_VALUE}
                  currentValue={USER_CURRENT_LOCATION_VALUE}
                  selected={selectedLocation === CUSTOM_ADDRESS_VALUE ? CUSTOM_ADDRESS_VALUE : selectedLocation}
                  activeAddress={selectedLocation === CUSTOM_ADDRESS_VALUE ? activeAddress : null}
                  history={addressHistory}
                  resolving={isResolvingAddress || isLocating}
                  note={selectedLocation === CUSTOM_ADDRESS_VALUE ? addressNote : null}
                  detected={detected}
                  detecting={detecting}
                  detectError={detectError}
                  onDetect={detectLocation}
                  onUseDetected={() => { if (detected) { applyAddress(detected); setDetected(null); } }}
                  onSelectArea={handleLocationChange}
                  onSelectAddress={applyAddress}
                  onSubmitAddress={submitAddress}
                  onForgetAddress={(addr) => { setAddressHistory(forgetAddress(addr)); if (activeAddress === addr) { setActiveAddress(null); if (selectedLocation === CUSTOM_ADDRESS_VALUE) setSelectedLocation(ALL_LOCATIONS_VALUE); } }}
                />
                {isLocating && <p className="text-xs text-muted-foreground mt-2">Fetching your location...</p>}
                {!isLocating && selectedLocation === USER_CURRENT_LOCATION_VALUE && !locationError && (
                  <p className="text-xs text-muted-foreground mt-2">Resolving address…</p>
                )}
                {locationError && (
                  <Alert variant="destructive" className="mt-2 py-2 px-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-xs">Location Error</AlertTitle>
                    <AlertDescription className="text-xs">{locationError}</AlertDescription>
                  </Alert>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center text-foreground">
                  <Store className="h-4 w-4 mr-2 text-primary" />
                  Filter by Vendor
                </h3>
                  <div className="flex flex-col">
                    <Select onValueChange={handleVendorChange} value={activeView === 'markets' ? 'All' : selectedVendorId}>
                    <SelectTrigger className="w-full h-10 rounded-lg border-border focus:ring-primary">
                        <SelectValue placeholder="Select a vendor" />
                    </SelectTrigger>
                    <SelectContent>
                        {vendorOptions.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.businessName}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
              </div>
              <div>
                <span className="mb-2 hidden text-sm md:block">&nbsp;</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant={searchTerm ? 'default' : 'outline'}
                      aria-label="Search products, markets and vendors"
                      className="relative h-10 w-full rounded-lg md:w-10 md:px-0"
                    >
                      <Search className="h-4 w-4" />
                      <span className="ml-2 md:sr-only">Search</span>
                      {searchTerm && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 md:block" />}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="end" sideOffset={8} className="w-[min(20rem,calc(100vw-2rem))] p-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        autoFocus
                        type="search"
                        placeholder="Products, markets, vendors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-full h-10 rounded-lg border-border focus:ring-primary"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <FitChips items={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
            </div>
          </div>

          <TabsContent value="products" className="mt-0 outline-none space-y-12">
            {/* Awoof Deals Horizontal Scroll */}
            {flashDeals.length > 0 && searchTerm === '' && (
              <section className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Zap className="h-6 w-6 text-red-600 fill-current" />
                    Awoof Deals of the Day
                  </h2>
                  <Badge variant="outline" className="border-red-600 text-red-600">Limited Time</Badge>
                </div>
                <ScrollArea className="w-full whitespace-nowrap rounded-md">
                  <div className="flex w-max space-x-6 p-1">
                    {flashDeals.map((product) => (
                      <FlashDealCard key={product.id} product={product} />
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </section>
            )}

            {storesSection}

            {filteredProducts.length > 0 ? (
              <section>
                 <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                  Explore Local Items
                </h2>
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
              </section>
            ) : matchedStores.length > 0 ? null : (
               <div className="text-center py-20">
                {isLocating && selectedLocation === USER_CURRENT_LOCATION_VALUE ? (
                  <div className="flex flex-col items-center">
                    <LocateFixed className="h-14 w-14 text-primary/40 mb-4 animate-pulse" />
                    <p className="text-xl font-semibold mb-2">Locating you...</p>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                      Finding the best local items nearby.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Search className="h-14 w-14 text-muted-foreground/40 mb-4" />
                    <p className="text-xl font-semibold mb-2">No items found</p>
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

          {/* Mobile App Promotion Section */}
          <section className="mt-20 py-12 px-6 bg-gradient-to-br from-primary/10 to-accent/20 rounded-3xl border border-primary/20 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
               <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor" className="text-primary" />
               </svg>
            </div>
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-lg mb-2">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">Closebuy Mobile is Coming!</h2>
              <p className="text-lg text-muted-foreground">
                We're currently building our Android and iOS apps to make market errands even smoother. Get notifications, real-time GPS tracking, and one-tap checkout.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Button variant="outline" size="lg" className="h-14 px-8 border-2 gap-3" disabled>
                   <Apple className="h-6 w-6" /> App Store
                </Button>
                <Button variant="outline" size="lg" className="h-14 px-8 border-2 gap-3" disabled>
                   <Smartphone className="h-6 w-6" /> Play Store
                </Button>
              </div>
            </div>
          </section>
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
