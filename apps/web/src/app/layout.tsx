import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RoadSaathi | Local mechanics. Reliable roadside help.',
  description:
    'Instant roadside assistance across Mangaluru and India. Connect with approved mobile mechanics, puncture shops, battery specialists, and towing services with transparent disclosed visit fees.',
  keywords: [
    'roadside assistance India',
    'mechanic near me',
    'car puncture repair Mangaluru',
    'bike breakdown service',
    'battery jumpstart India',
    'towing service Karnataka',
  ],
  authors: [{ name: 'RoadSaathi' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F5FAFF] text-[#0F172A] antialiased">
        {children}
      </body>
    </html>
  );
}
