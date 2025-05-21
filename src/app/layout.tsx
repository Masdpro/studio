
import type { Metadata } from 'next';
// Removed Geist font imports
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// Removed geistSans and geistMono initializations

export const metadata: Metadata = {
  title: 'Dailybuy',
  description: 'Your on-demand delivery solution.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Removed font variables from body className */}
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
