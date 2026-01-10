'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  BotMessageSquare,
  Settings,
  ChevronDown,
  FolderInput,
  CalendarDays } from
'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Logo } from '@/components/icons/logo';
import { cn } from '@/lib/utils';
import { DOMAIN_LIST } from '@/lib/domains';
import { useState } from 'react';

const navItems = [
{ href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
{ href: '/today', icon: CalendarDays, label: 'Today' },
{ href: '/tasks', icon: CheckSquare, label: 'Tasks' },
{ href: '/prioritize', icon: BotMessageSquare, label: 'AI Prioritizer' },
{ href: '/import', icon: FolderInput, label: 'AI Import' }];


export function AppSidebar() {
  const pathname = usePathname();
  const [domainsOpen, setDomainsOpen] = useState(false);

  return (
    <aside id="layout-sidebar" className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col app-sidebar sm:flex">
      <nav id="layout-sidebar-nav" className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <Link
          id="layout-sidebar-logo"
          href="/dashboard"
          className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base">

          <Logo className="h-5 w-5 text-primary-foreground transition-all group-hover:scale-110" />
          <span id="el-126" className="sr-only">Action Deck</span>
        </Link>

        <TooltipProvider>
          {navItems.map((item) => {
            const navId = `layout-sidebar-nav-${item.href.split('/').pop()}`;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    id={navId}
                    href={item.href}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                      pathname.startsWith(item.href) && "bg-accent text-accent-foreground"
                    )}>

                    <item.icon className="h-5 w-5" />
                    <span id="el-127" className="sr-only">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>);

          })}

          {/* Domains Section */}
          <Collapsible id="layout-sidebar-domains" open={domainsOpen} onOpenChange={setDomainsOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <CollapsibleTrigger
                  id="layout-sidebar-domains-trigger"
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                    pathname.startsWith('/domain') && "bg-accent text-accent-foreground"
                  )}>

                  <ChevronDown className={cn("h-5 w-5 transition-transform", domainsOpen && "rotate-180")} />
                  <span id="el-128" className="sr-only">Domains</span>
                </CollapsibleTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">Domains</TooltipContent>
            </Tooltip>

            <CollapsibleContent className="space-y-1 mt-1">
              {DOMAIN_LIST.map((domain) => {
                const Icon = domain.icon;
                const isActive = pathname === `/domain/${domain.value}`;

                return (
                  <Tooltip key={domain.value}>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/domain/${domain.value}`}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-all mx-auto",
                          isActive ?
                          "text-white" :
                          "text-muted-foreground hover:text-foreground"
                        )}
                        style={
                        isActive ?
                        {
                          background: domain.bgGradient,
                          boxShadow: `0 2px 8px ${domain.color}40`
                        } :
                        undefined
                        }>

                        <Icon className="h-4 w-4" style={!isActive ? { color: domain.color } : undefined} />
                        <span id="el-129" className="sr-only">{domain.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{domain.label}</TooltipContent>
                  </Tooltip>);

              })}
            </CollapsibleContent>
          </Collapsible>

          <Tooltip>
            <TooltipTrigger asChild>
              <button id="layout-sidebar-settings"
              onClick={() => {const btn = document.getElementById('header-filters-trigger') as HTMLButtonElement | null;btn?.click();}}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
              aria-label="Filters">

                <Settings className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Filters</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>
    </aside>);

}