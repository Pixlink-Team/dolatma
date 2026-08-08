import { MonitoringPathsProvider } from "@/components/admin/monitoring/monitoring-paths";

export default function ReisMonitoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MonitoringPathsProvider mode="reis">{children}</MonitoringPathsProvider>;
}
