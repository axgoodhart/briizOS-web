
'use client';
import Link from 'next/link';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PanelLeft, LayoutDashboard, CheckSquare, BotMessageSquare, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Logo } from '@/components/icons/logo';
import { cn } from '@/lib/utils';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import React from 'react';
import { SettingsModal } from './settings-modal';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/prioritize', icon: BotMessageSquare, label: 'AI Prioritizer' },
];

export function Header() {
  const pathname = usePathname();
  const pageTitle = navItems.find(item => pathname.startsWith(item.href))?.label || 'Dashboard';
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 app-header-bar px-4 sm:static sm:h-auto sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <SheetTitle className="sr-only">Main Menu</SheetTitle>
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="group flex h-10 items-center gap-4 rounded-full text-lg font-semibold"
            >
              <div className="bg-primary rounded-full p-2">
                <Logo className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-headline text-xl text-primary">Action Deck</span>
            </Link>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                  pathname.startsWith(item.href) && "text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={(e)=>{ e.preventDefault(); const btn=document.getElementById('header-settings-trigger'); (btn as HTMLButtonElement)?.click(); }}
              className="text-left flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-5 w-5" />
              Settings
            </button>
          </nav>
        </SheetContent>
      </Sheet>
      
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="relative ml-auto flex items-center gap-2">
        <ThemeToggle />
        <Button id="header-settings-trigger" size="icon" variant="outline" onClick={()=>setOpen(true)} aria-label="Settings">
          <Settings className="h-8 w-8" />
        </Button>
        <SettingsModal open={open} onOpenChange={setOpen} />
      </div>
    </header>
  );
}
