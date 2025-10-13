import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "도로 네트워크 분석기",
    template: "%s | 도로 네트워크 분석기"
  },
  description: "OpenStreetMap 데이터를 활용한 실시간 도로 네트워크 분석 도구. GeoJSON 기반 지도 분석, 교차점 감지, 도로 편집 기능을 제공합니다.",
  generator: "Next.js",
  applicationName: "도로 네트워크 분석기",
  keywords: [
    "도로 네트워크", "OpenStreetMap", "GIS", "지도 분석", "교통 분석", 
    "GeoJSON", "Leaflet", "도로 편집", "교차점 분석", "Overpass API",
    "지리정보시스템", "공간분석", "도로망 분석", "교통망 분석"
  ],
  authors: [{ name: "Road Network Analyzer Team" }],
  creator: "Road Network Analyzer",
  publisher: "Road Network Analyzer",
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
    locale: 'ko_KR',
    url: 'https://road-network-analyzer.vercel.app',
    title: '도로 네트워크 분석기',
    description: 'OpenStreetMap 데이터를 활용한 실시간 도로 네트워크 분석 도구',
    siteName: '도로 네트워크 분석기',
  },
  twitter: {
    card: 'summary_large_image',
    title: '도로 네트워크 분석기',
    description: 'OpenStreetMap 데이터를 활용한 실시간 도로 네트워크 분석 도구',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          {children}
          <Toaster />
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
