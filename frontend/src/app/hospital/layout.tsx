import DashboardLayout from "@/components/layout/DashboardLayout";

export default function HospitalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="hospital_admin">{children}</DashboardLayout>;
}
