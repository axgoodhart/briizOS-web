'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  BotMessageSquare,
  Settings,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Logo } from '@/components/icons/logo';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/prioritize', icon: BotMessageSquare, label: 'AI Prioritizer' },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col app-sidebar sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <Link
          href="/dashboard"
          className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
        >
          <Logo className="h-5 w-5 text-primary-foreground transition-all group-hover:scale-110" />
          <span className="sr-only">Action Deck</span>
        </Link>
        <TooltipProvider>
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                    pathname.startsWith(item.href) && "bg-accent text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
          <Tooltip>
            <TooltipTrigger asChild>
              <button id="settingsModalBtn"
                onClick={() => { const btn = document.getElementById('header-settings-trigger') as HTMLButtonElement | null; btn?.click(); }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>
    </aside>
  );
}
