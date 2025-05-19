import Link from 'next/link';
import { Home, ShoppingCart, UserPlus, Truck, Route, Settings, Store } from 'lucide-react';
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

const navItems = [
  { href: '/', label: 'Home', icon: Home, tooltip: "Browse Products" },
  { href: '/cart', label: 'Cart', icon: ShoppingCart, tooltip: "View Your Cart" },
];

const vendorItems = [
  { href: '/auth/register/vendor', label: 'Vendor Registration', icon: UserPlus, tooltip: "Register as Vendor" },
  { href: '/vendor/dashboard', label: 'Vendor Dashboard', icon: Store, tooltip: "Manage Your Store" },
  { href: '/vendor/dashboard/products', label: 'Manage Products', icon: Settings, tooltip: "Add/Edit Products" },
];

const deliveryItems = [
  { href: '/delivery/optimize-route', label: 'Optimize Route', icon: Route, tooltip: "Delivery Route Optimizer" },
];


export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      <SidebarHeader>
        {/* Can add logo or search here */}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarGroup>
            <SidebarGroupLabel>Customer</SidebarGroupLabel>
            {navItems.map((item) => (
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
             <SidebarGroupLabel>Delivery</SidebarGroupLabel>
            {deliveryItems.map((item) => (
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
