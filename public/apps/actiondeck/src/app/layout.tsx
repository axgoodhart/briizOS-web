import type { Metadata } from 'next';
import './globals.css';
import '../styles/dashboard.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { AutoIdInjector } from '@/components/auto-id-injector';

export const metadata: Metadata = {
  title: 'Action Deck',
  description: 'Casual todos and personal project management.'
};

export default function RootLayout({
  children


}: Readonly<{children: React.ReactNode;}>) {
  return (
    <html id="el-346" lang="en" suppressHydrationWarning>
      <head id="el-347">
        <link id="el-348" rel="preconnect" href="https://fonts.googleapis.com" />
        <link id="el-349" rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link id="el-350" href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&family=Nokie&family=Playwrite+NL&display=swap" rel="stylesheet" />
      </head>
      <body id="el-351" className="font-body antialiased browzr-skin">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange>

          <AutoIdInjector />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>);

}