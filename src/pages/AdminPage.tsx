import { Activity, Flag, Gauge, MessagesSquare, UserPlus, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import { adminChartData } from "@/lib/presence-content";

const chartConfig = {
  sessions: { label: "Sessions", color: "#8b5cf6" },
  reports: { label: "Reports", color: "#f59e0b" },
  signups: { label: "Signups", color: "#60a5fa" },
};

const AdminPage = () => {
  const { adminMetrics } = usePresence();

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-4 p-6 sm:p-8">
        <SectionTitle
          eyebrow="hidden route"
          title="Presence admin"
          body="Lean operating dashboard for launch metrics, queue health, and trust & safety signals."
        />
      </Surface>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={Users} label="Total users" value={adminMetrics.totalUsers.toString()} />
        <MetricCard icon={Activity} label="Active users" value={adminMetrics.activeUsers.toString()} />
        <MetricCard icon={Gauge} label="Queue count" value={adminMetrics.queueCount.toString()} />
        <MetricCard icon={MessagesSquare} label="Active rooms" value={adminMetrics.activeRooms.toString()} />
        <MetricCard icon={Flag} label="Reports count" value={adminMetrics.reportsCount.toString()} />
        <MetricCard icon={UserPlus} label="Daily signups" value={adminMetrics.dailySignups.toString()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Surface className="p-5">
          <p className="mb-4 text-sm uppercase tracking-[0.22em] text-white/40">Sessions + reports</p>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <AreaChart data={adminChartData}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="var(--color-sessions)"
                fill="var(--color-sessions)"
                fillOpacity={0.18}
              />
              <Area
                type="monotone"
                dataKey="reports"
                stroke="var(--color-reports)"
                fill="var(--color-reports)"
                fillOpacity={0.14}
              />
            </AreaChart>
          </ChartContainer>
        </Surface>

        <Surface className="p-5">
          <p className="mb-4 text-sm uppercase tracking-[0.22em] text-white/40">Signups</p>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart data={adminChartData}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="signups" fill="var(--color-signups)" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </Surface>
      </div>

      <Surface className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-white/45">Average session duration</p>
          <p className="mt-2 text-2xl font-semibold text-white">{adminMetrics.averageSessionDuration} min</p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-white/45">Average wait time</p>
          <p className="mt-2 text-2xl font-semibold text-white">{adminMetrics.avgWaitTimeSeconds}s</p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-white/45">Trust & safety state</p>
          <p className="mt-2 text-2xl font-semibold text-white">Stable</p>
        </div>
      </Surface>
    </PageShell>
  );
};

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Surface className="p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </Surface>
  );
}

export default AdminPage;
