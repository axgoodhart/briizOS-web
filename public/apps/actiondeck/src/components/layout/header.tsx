
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
import { FiltersModal } from './filters-modal';

const navItems = [
{ href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
{ href: '/tasks', icon: CheckSquare, label: 'Tasks' },
{ href: '/prioritize', icon: BotMessageSquare, label: 'AI Prioritizer' }];


export function Header() {
  const pathname = usePathname();
  const pageTitle = navItems.find((item) => pathname.startsWith(item.href))?.label || 'Dashboard';
  const [open, setOpen] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  return (
    <header id="layout-header" className="sticky top-0 z-30 flex h-14 items-center gap-4 app-header-bar px-4 sm:static sm:h-auto sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button id="layout-header-mobile-trigger" size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span id="el-130" className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <SheetTitle className="sr-only">Main Menu</SheetTitle>
          <nav id="el-131" className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="group flex h-10 items-center gap-4 rounded-full text-lg font-semibold">

              <div id="el-132" className="bg-primary rounded-full p-2">
                <Logo className="h-5 w-5 text-primary-foreground" />
              </div>
              <span id="el-133" className="font-headline text-xl text-primary">Action Deck</span>
            </Link>
            {navItems.map((item) =>
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                pathname.startsWith(item.href) && "text-foreground"
              )}>

                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )}
            <button id="el-134"
            onClick={(e) => {e.preventDefault();const btn = document.getElementById('header-settings-trigger');(btn as HTMLButtonElement)?.click();}}
            className="text-left flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">

              <Settings className="h-5 w-5" />
              Settings
            </button>
          </nav>
        </SheetContent>
      </Sheet>
      
      <Breadcrumb id="layout-header-breadcrumb" className="hidden md:flex">
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

      <div id="el-135" className="relative ml-auto flex items-center gap-2">
        <ThemeToggle />
        <Button id="layout-header-settings-trigger" size="icon" variant="outline" onClick={() => setOpen(true)} aria-label="Settings">
          <Settings className="h-8 w-8" />
        </Button>
        {/* Hidden trigger for filters modal - used by sidebar */}
        <button id="header-filters-trigger" className="hidden" onClick={() => setFiltersOpen(true)} aria-hidden="true" />
        <SettingsModal open={open} onOpenChange={setOpen} />
        <FiltersModal open={filtersOpen} onOpenChange={setFiltersOpen} />
      </div>
    </header>);

}