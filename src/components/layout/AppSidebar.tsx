'use client';
import { useTradingStatus } from '@/hooks/use-trading-status';


import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { Home, ListChecks, UserPlus, Truck, Route, Settings, Store, Bike, Edit3, SearchCheck, ShoppingBasket, History, ShieldCheck, MapPin, ShoppingBag } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel
} from '@/components/ui/sidebar';

const customerNavItems = [
  { href: '/', label: 'Home', icon: Home, tooltip: "Browse Products" },
  { href: '/orders', label: 'My Orders', icon: ListChecks, tooltip: "Track Your Orders" },
];

const customerErrandItems = [
  { href: '/errands/create', label: 'Create Errand', icon: Edit3, tooltip: "Request an Errand" },
  { href: '/errands', label: 'My Errands', icon: History, tooltip: "View Your Errand Requests" },
];

const becomeItems = [
  { href: '/auth/register/vendor', label: 'Become a Vendor', icon: UserPlus, tooltip: "Register as a Vendor" },
  { href: '/auth/register/delivery-agent', label: 'Become an Agent', icon: Bike, tooltip: "Register as a Delivery Agent" },
];

const branchItems = [
  { href: '/branch', label: 'Branch Dashboard', icon: Store, tooltip: "Your branch analytics" },
  { href: '/branch/orders', label: 'Orders', icon: ListChecks, tooltip: "Orders for your branch" },
  { href: '/branch/products', label: 'Products', icon: Settings, tooltip: "Products sold only at your branch" },
];

const vendorItems = [
  { href: '/vendor/dashboard', label: 'Vendor Dashboard', icon: Store, tooltip: "Manage Your Store" },
  { href: '/vendor/orders', label: 'Orders', icon: ListChecks, tooltip: "Manage Customer Orders" },
  { href: '/vendor/dashboard/products', label: 'Manage Products', icon: Settings, tooltip: "Add/Edit Products" },
];

const commonDeliveryItems = [
  { href: '/delivery/optimize-route', label: 'Optimize Route AI', icon: Route, tooltip: "Delivery Route Optimizer" },
];

const deliveryAgentItems = [
  { href: '/delivery-agent/dashboard', label: 'Agent Dashboard', icon: Truck, tooltip: "Delivery Agent Dashboard"},
  { href: '/delivery-agent/errands/browse', label: 'Browse Errands', icon: SearchCheck, tooltip: "Find Errands to Quote"},
];

const adminItems = [
  { href: '/admin', label: 'Admin Dashboard', icon: ShieldCheck, tooltip: "Admin Dashboard" },
  { href: '/admin/markets', label: 'Markets', icon: MapPin, tooltip: "Manage Markets" },
  { href: '/admin/vendors', label: 'Vendors', icon: Store, tooltip: "Manage Vendors" },
  { href: '/admin/products', label: 'Products', icon: ShoppingBag, tooltip: "Manage Products" },
  { href: '/admin/agents', label: 'Agents', icon: Bike, tooltip: "Manage Delivery Agents" },
  { href: '/admin/verifications', label: 'Verifications', icon: ShieldCheck, tooltip: "Review vendor and agent verifications" },
];

type NavItem = { href: string; label: string; icon: React.ComponentType; tooltip: string };

function Group({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild tooltip={item.tooltip}>
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarGroup>
  );
}

const customerGroup = { label: 'Customer', items: [...customerNavItems, ...customerErrandItems] };

export function AppSidebar() {
  const { role, roles, loading } = useAuth();
  const { mayTrade } = useTradingStatus();

  // Each role only sees its own menu. Customers (and visitors) also get the two ways to become a vendor or agent.
  let groups: { label: string; items: NavItem[] }[] = [];
  if (!loading) {
    if (role === 'admin') {
      groups = [{ label: 'Admin', items: adminItems }];
    } else {
      const isVendor = roles.includes('vendor');
      const isAgent = roles.includes('delivery_agent');
      groups = [customerGroup];
      if (isVendor) groups.push({ label: 'Vendor', items: mayTrade ? vendorItems : vendorItems.slice(0, 1) });
      if (isAgent) groups.push({ label: 'Delivery', items: mayTrade ? [...deliveryAgentItems, ...commonDeliveryItems] : deliveryAgentItems.slice(0, 1) });
      if (roles.includes('branch')) groups.push({ label: 'Branch', items: branchItems });
      const more = becomeItems.filter((i) => (i.href.includes('/vendor') ? !isVendor : !isAgent));
      if (more.length && !roles.includes('branch')) groups.push({ label: 'Grow with Closebuy', items: more });
    }
  }

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      {/* Logo pinned to the top: only the menu below scrolls. */}
      <SidebarHeader className="h-16 shrink-0 justify-center border-b px-4">
        <Link href={role === 'admin' ? '/admin' : '/'} className="flex items-center gap-2">
          <Image src="/logo-mark.png" alt="" width={30} height={39} className="block shrink-0" />
          <span className="text-xl font-bold text-primary group-data-[collapsible=icon]:hidden">Closebuy</span>
          <span className="sr-only">Closebuy home</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {groups.map((g, i) => (
            <div key={g.label}>
              {i > 0 && <SidebarSeparator />}
              <Group label={g.label} items={g.items} />
            </div>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {/* Footer content, e.g. settings or user profile */}
      </SidebarFooter>
    </Sidebar>
  );
}
