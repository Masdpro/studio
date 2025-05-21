
// src/app/(app)/profile/page.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, MapPin } from 'lucide-react';

// Mock customer data
const customerData = {
  name: 'Alice Wonderland',
  email: 'alice.w@example.com',
  phone: '555-123-4567',
  address: '123 Dream Lane, Fantasyland, FL 12345',
  avatarUrl: 'https://placehold.co/100x100.png',
  initials: 'AW',
};

export default function CustomerProfilePage() {
  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader className="text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4 border-2 border-primary">
            <AvatarImage src={customerData.avatarUrl} alt={customerData.name} data-ai-hint="person portrait" />
            <AvatarFallback className="text-3xl">{customerData.initials}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl font-bold">{customerData.name}</CardTitle>
          <CardDescription>Your personal account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-md">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{customerData.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-md">
            <Phone className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{customerData.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-md">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{customerData.address}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="outline">Edit Profile (Soon)</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
