
import Link from 'next/link';
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

const vendorItems = [
  { href: '/auth/register/vendor', label: 'Vendor Registration', icon: UserPlus, tooltip: "Register as Vendor" },
  { href: '/vendor/dashboard', label: 'Vendor Dashboard', icon: Store, tooltip: "Manage Your Store" },
  { href: '/vendor/dashboard/products', label: 'Manage Products', icon: Settings, tooltip: "Add/Edit Products" },
];

const commonDeliveryItems = [
  { href: '/delivery/optimize-route', label: 'Optimize Route AI', icon: Route, tooltip: "Delivery Route Optimizer" },
];

const deliveryAgentItems = [
  { href: '/auth/register/delivery-agent', label: 'Agent Registration', icon: Bike, tooltip: "Register as Delivery Agent"},
  { href: '/delivery-agent/dashboard', label: 'Agent Dashboard', icon: Truck, tooltip: "Delivery Agent Dashboard"},
  { href: '/delivery-agent/errands/browse', label: 'Browse Errands', icon: SearchCheck, tooltip: "Find Errands to Quote"},
];

const adminItems = [
  { href: '/admin', label: 'Admin Dashboard', icon: ShieldCheck, tooltip: "Admin Dashboard" },
  { href: '/admin/markets', label: 'Markets', icon: MapPin, tooltip: "Manage Markets" },
  { href: '/admin/vendors', label: 'Vendors', icon: Store, tooltip: "Manage Vendors" },
  { href: '/admin/products', label: 'Products', icon: ShoppingBag, tooltip: "Manage Products" },
  { href: '/admin/agents', label: 'Agents', icon: Bike, tooltip: "Manage Delivery Agents" },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      {/* Logo pinned to the top: only the menu below scrolls. */}
      <SidebarHeader className="h-16 shrink-0 justify-center border-b px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-mark.png" alt="" width={30} height={39} className="block shrink-0" />
          <span className="text-xl font-bold text-primary group-data-[collapsible=icon]:hidden">Closebuy</span>
          <span className="sr-only">Closebuy home</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarGroup>
            <SidebarGroupLabel>Customer</SidebarGroupLabel>
            {customerNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild tooltip={item.tooltip}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarSeparator className="my-1" />
             {customerErrandItems.map((item) => (
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
          <SidebarSeparator />
          <SidebarGroup>
             <SidebarGroupLabel>Vendor</SidebarGroupLabel>
            {vendorItems.map((item) => (
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
           <SidebarSeparator />
          <SidebarGroup>
             <SidebarGroupLabel>Delivery Services</SidebarGroupLabel>
            {commonDeliveryItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild tooltip={item.tooltip}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {deliveryAgentItems.map((item) => (
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
          <SidebarSeparator />
          <SidebarGroup>
             <SidebarGroupLabel>Admin</SidebarGroupLabel>
            {adminItems.map((item) => (
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
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {/* Footer content, e.g. settings or user profile */}
      </SidebarFooter>
    </Sidebar>
  );
}
