import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { ProjectProvider } from '@/context/project-context';
import { SettingsProvider } from '@/context/settings-context';

// Force dynamic rendering for all app routes using Firebase
export const dynamic = 'force-dynamic';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <SettingsProvider>
      <ProjectProvider>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <AppSidebar />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <Header />
          <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            {children}
          </main>
        </div>
      </div>
    </ProjectProvider>
    </SettingsProvider>
  );
}
