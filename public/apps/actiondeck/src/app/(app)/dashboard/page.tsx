import { DashboardSummary } from '@/components/dashboard/dashboard-summary';
import { ProjectList } from '@/components/dashboard/project-list';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardSummary />
      <ProjectList />
    </div>
  );
}
