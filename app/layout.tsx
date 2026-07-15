import type { Metadata, Viewport } from 'next'
import { Amiri, Noto_Sans_Arabic, Playfair_Display, Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Navbar } from '@/components/Navbar'
import { BottomNav } from '@/components/BottomNav'
import { Footer } from '@/components/Footer'
import { PushNotification } from '@/components/PushNotification'
import Script from 'next/script'

const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-amiri',
  display: 'swap',
})

const noto = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-noto',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://flore.jo'),
  title: {
    default: 'FLORÉ Luxury | فلوري - الفخامة في كل تفصيلة',
    template: '%s | FLORÉ Luxury'
  },
  description: 'بوكيهات فاخرة بتصاميم حصرية، توصيل سريع في عمّان، الزرقاء، وكافة أنحاء المملكة. اكتشف مجموعتنا الفريدة من الزهور والهدايا الفاخرة.',
  keywords: ['زهور', 'بوكيه', 'فاخر', 'عمّان', 'الزرقاء', 'أردن', 'هدايا', 'توصيل', 'ورد', 'مناسبات', 'زهور اونلاين'],
  authors: [{ name: 'FLORÉ Luxury' }],
  creator: 'FLORÉ Luxury',
  publisher: 'FLORÉ Luxury',
  manifest: '/manifest.json', // الربط الرسمي لملف الـ PWA لمنع تعارض الـ Build
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FLORÉ Luxury',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ar_JO',
    url: 'https://flore.jo',
    siteName: 'FLORÉ Luxury',
    title: 'FLORÉ Luxury | فلوري - الفخامة في كل تفصيلة',
    description: 'بوكيهات فاخرة بتصاميم حصرية، توصيل سريع في عمّان والأردن.',
    images: [
      {
        url: '/images/og-default.jpg',
        width: 1200,
        height: 630,
        alt: 'FLORÉ Luxury - فلوري',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FLORÉ Luxury | فلوري',
    description: 'بوكيهات فاخرة بتصاميم حصرية في عمّان والزرقاء',
    images: ['/images/og-default.jpg'],
    creator: '@flore_luxury',
  },
  alternates: {
    canonical: 'https://flore.jo',
    languages: {
      'ar-JO': 'https://flore.jo',
      'en-JO': 'https://flore.jo/en',
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF9F6' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1F1E' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${amiri.variable} ${noto.variable} ${playfair.variable} ${inter.variable}`}>
      {/* تم إفراغ الـ <head> اليدوي لتجنب تحذيرات الـ Console وأخطاء مطابقة الـ Server/Client */}
      <body className="font-noto bg-flore-bg text-flore-text-primary min-h-screen">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <Navbar />
          <main className="pt-16 pb-20 md:pb-0">{children}</main>
          <BottomNav />
          <Footer />
          <PushNotification />
        </ThemeProvider>

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XXXXXXXXXX');
          `}
        </Script>

        {/* Schema.org Structured Data */}
        <Script
          id="schema-org"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'FLORÉ Luxury',
            image: 'https://flore.jo/images/og-default.jpg',
            description: 'بوكيهات فاخرة بتصاميم حصرية، توصيل سريع في عمّان، الزرقاء، وكافة محافظات الأردن',
            url: 'https://flore.jo',
            telephone: '+962788570246',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'عمّان',
              addressCountry: 'JO',
            },
            geo: {
              '@type': 'GeoCoordinates',
              latitude: 31.9454,
              longitude: 35.9284,
            },
            openingHoursSpecification: [
              {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
                opens: '09:00',
                closes: '21:00',
              },
            ],
            priceRange: '$$$',
            currenciesAccepted: 'JOD',
            paymentAccepted: 'Cash, Credit Card, CliQ',
          })}
        </Script>
      </body>
    </html>
  )
}


