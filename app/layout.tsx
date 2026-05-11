import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { Clock, BarChart2 } from 'lucide-react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Clock Report',
  description: 'Personal time & drive tracker',
}

export const viewport: Viewport = {
  themeColor: '#0a0f1e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          {/* Nav */}
          <header className="border-b border-border/50 sticky top-0 z-40 bg-background/80 backdrop-blur-sm">
            <nav className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 font-semibold text-foreground hover:opacity-80 transition-opacity">
                <Clock className="h-5 w-5 text-emerald-400" />
                <span>Clock Report</span>
              </Link>
              <Link
                href="/reports"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <BarChart2 className="h-4 w-4" />
                Reports
              </Link>
            </nav>
          </header>

          {/* Main content */}
          <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
            {children}
          </main>

          <footer className="border-t border-border/30 py-4">
            <p className="text-center text-xs text-muted-foreground">Clock Report</p>
          </footer>
        </div>
      </body>
    </html>
  )
}
