"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import {
  Users, Building2, Calendar, FileText, Activity, ArrowUpRight,
  RefreshCcw, Clock, Plus, ChevronRight, Stethoscope, Shield,
  CheckCircle2, XCircle, Sparkles, ArrowRight, Settings, TrendingUp, Star, Award
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { toast } from "sonner";

/* ─── Animated Counter ─── */
function AnimatedNumber({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (value === 0) { setCount(0); return; }
    let start = 0;
    const step = Math.max(1, Math.floor(value / 40));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else setCount(start);
    }, 25);
    return () => clearInterval(timer);
  }, [value]);
  return <>{count.toLocaleString()}</>;
}

/* ─── Chart Tooltip ─── */
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-lg text-xs">
        <p className="font-bold text-gray-500 mb-1.5">{label}</p>
        {payload.map((e: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4 mb-0.5">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: e.color }} /> {e.name}</span>
            <span className="font-bold text-gray-900">{e.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [patientStats, setPatientStats] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [topDoctors, setTopDoctors] = useState<any[]>([]);
  const [pendingHospitals, setPendingHospitals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const [statsRes, trendsRes, patientStatsRes, logsRes, pendingRes, doctorsRes]: any = await Promise.all([
        api.get("/analytics/dashboard"),
        api.get("/analytics/appointments/trends?days=6"),
        api.get("/analytics/patients/stats"),
        api.get("/analytics/audit-logs?limit=8"),
        api.get("/hospitals/admin/all?status=pending").catch(() => ({ data: [] })),
        api.get("/analytics/doctors/stats").catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      
      const trendsData = trendsRes.data || [];
      const filledTrends = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const existing = trendsData.find((t: any) => format(new Date(t.date), 'yyyy-MM-dd') === dateStr);
        filledTrends.push({
          date: dateStr,
          count: existing ? existing.count : 0,
          completed: existing ? existing.completed : 0,
          cancelled: existing ? existing.cancelled : 0,
        });
      }
      setTrends(filledTrends);
      
      setPatientStats(patientStatsRes.data || []);
      setLogs(logsRes.data || []);
      setPendingHospitals(pendingRes.data || []);
      setTopDoctors(doctorsRes.data || []);
    } catch (error) {
      console.error("Failed to fetch admin data", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: number) => {
    try {
      await api.put(`/hospitals/${id}/status`, { status: "approve" });
      toast.success("Hospital approved successfully");
      setPendingHospitals((prev) => prev.filter((h) => h.id !== id));
    } catch (e: any) { toast.error(e.message || "Failed to approve"); }
  };

  const handleReject = async (id: number) => {
    try {
      await api.put(`/hospitals/${id}/status`, { status: "reject" });
      toast.success("Hospital rejected");
      setPendingHospitals((prev) => prev.filter((h) => h.id !== id));
    } catch (e: any) { toast.error(e.message || "Failed to reject"); }
  };

  const getLogLabel = (action: string) => {
    if (action.includes("LOGIN")) return { text: "Login", color: "bg-emerald-100 text-emerald-600" };
    if (action.includes("REGISTER") || action.includes("CREATE")) return { text: "Created", color: "bg-blue-100 text-blue-600" };
    if (action.includes("DELETE") || action.includes("REJECT")) return { text: "Removed", color: "bg-red-100 text-red-600" };
    if (action.includes("UPDATE")) return { text: "Updated", color: "bg-amber-100 text-amber-600" };
    return { text: "Action", color: "bg-gray-100 text-gray-600" };
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-500 pb-8">

      {/* ─── Hero Section ─── */}
      <div 
        className="relative overflow-hidden rounded-[24px] p-7 md:p-8 text-emerald-950 border border-emerald-100/50 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #E8FFF6 0%, #DDFBF4 100%)' }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/4 w-56 h-56 bg-emerald-400/5 rounded-full translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-emerald-700 text-sm font-semibold flex items-center tracking-wide uppercase">
                <Clock className="w-3.5 h-3.5 mr-1" /> {format(new Date(), "EEEE, MMMM d, yyyy")}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2 text-emerald-900">Welcome back, Super Admin</h1>
            <p className="text-emerald-700/90 text-sm max-w-lg font-medium">
              {pendingHospitals.length > 0
                ? `You have ${pendingHospitals.length} pending hospital approval${pendingHospitals.length > 1 ? "s" : ""} to review.`
                : "All systems operational with no pending actions."}
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Button onClick={fetchData} disabled={isRefreshing} className="bg-white/60 backdrop-blur-sm text-emerald-700 border border-emerald-200/60 hover:bg-white hover:text-emerald-800 rounded-xl h-10 px-5 font-bold text-sm shadow-sm transition-all active:scale-95">
              <RefreshCcw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} /> Sync Data
            </Button>
            <Link href="/admin/hospitals">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 rounded-xl h-10 px-5 font-bold text-sm transition-all active:scale-95">
                <Building2 className="w-4 h-4 mr-2" /> Manage Hospitals
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── KPI Stats ─── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "emerald", sub: `${stats?.totalPatients || 0} patients · ${stats?.totalDoctors || 0} doctors` },
          { label: "Active Hospitals", value: stats?.totalHospitals || 0, icon: Building2, color: "blue", sub: `${pendingHospitals.length} pending review` },
          { label: "Appointments", value: stats?.totalAppointments || 0, icon: Calendar, color: "violet", sub: `${stats?.todayAppointments || 0} scheduled today` },
          { label: "Medical Reports", value: stats?.totalReports || 0, icon: FileText, color: "teal", sub: "Stored securely" },
        ].map((kpi) => {
          const colors: Record<string, string> = {
            emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
            blue: "bg-blue-50 text-blue-600 border-blue-100",
            violet: "bg-violet-50 text-violet-600 border-violet-100",
            teal: "bg-teal-50 text-teal-600 border-teal-100",
          };
          return (
            <div key={kpi.label} className="group relative bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{kpi.label}</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${colors[kpi.color]}`}>
                  <kpi.icon className="w-4 h-4" />
                </div>
              </div>
              {isLoading ? <Skeleton className="h-9 w-20 rounded-lg" /> : (
                <>
                  <div className="text-3xl font-bold text-gray-900 tracking-tight"><AnimatedNumber value={kpi.value} /></div>
                  <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Main Grid ─── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* ─── Left: Chart + Pending ─── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Daily Appointment Trends Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-[15px]">Daily Appointment Trends</h2>
                  <p className="text-xs text-gray-400">Since May 17 · Booked vs Completed</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]"></span> Booked</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></span> Completed</span>
              </div>
            </div>
            <div className="p-5 pt-3">
              <div className="h-[350px] w-full">
                {isLoading ? <Skeleton className="w-full h-full rounded-xl" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => format(new Date(v), "MMM d")} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="count" name="Booked" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#fff", stroke: "#8b5cf6", strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="completed" name="Completed" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#fff", stroke: "#f97316", strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            {!isLoading && trends.length > 0 && (
              <div className="grid grid-cols-4 border-t border-gray-50">
                {[
                  { label: "Total Booked", value: trends.reduce((s: number, t: any) => s + Number(t.count || 0), 0), color: "text-blue-600" },
                  { label: "Completed", value: trends.reduce((s: number, t: any) => s + Number(t.completed || 0), 0), color: "text-emerald-600" },
                  { label: "Cancelled", value: trends.reduce((s: number, t: any) => s + Number(t.cancelled || 0), 0), color: "text-red-500" },
                  { label: "Completion %", value: `${trends.reduce((s: number, t: any) => s + Number(t.count || 0), 0) > 0 ? Math.round((trends.reduce((s: number, t: any) => s + Number(t.completed || 0), 0) / trends.reduce((s: number, t: any) => s + Number(t.count || 0), 0)) * 100) : 0}%`, color: "text-violet-600" },
                ].map((s, i) => (
                  <div key={i} className={`text-center py-3.5 ${i < 3 ? 'border-r border-gray-50' : ''}`}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{s.label}</p>
                    <p className={`text-lg font-bold ${s.color}`}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Hospital Approvals */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-[15px]">Pending Approvals</h2>
                  <p className="text-xs text-gray-400">Hospitals awaiting verification</p>
                </div>
              </div>
              <Badge className="bg-amber-50 text-amber-600 border-0 font-bold">{pendingHospitals.length}</Badge>
            </div>
            <div className="p-5">
              {isLoading ? (
                <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
              ) : pendingHospitals.length > 0 ? (
                <div className="space-y-3">
                  {pendingHospitals.map((h) => (
                    <div key={h.id} className="group flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:border-amber-200 hover:shadow-sm transition-all duration-200">
                      <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold text-lg flex-shrink-0">
                        {h.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{h.name}</p>
                        <p className="text-xs text-gray-400">{h.city}, {h.state} · {h.registration_number || "No reg."}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-8 px-3 text-xs font-semibold shadow-sm" onClick={() => handleApprove(h.id)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-lg h-8 px-3 text-xs font-semibold" onClick={() => handleReject(h.id)}>
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 mb-1">All caught up!</h3>
                  <p className="text-xs text-gray-400">No pending hospital approvals.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right Column ─── */}
        <div className="space-y-5">
          {/* Users by Role Pie Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-sm text-gray-900">User Demographics</h3>
              </div>
              {!isLoading && stats?.usersByRole && (
                <Badge className="bg-gray-50 text-gray-600 border-0 text-[10px] font-bold">{stats.usersByRole.reduce((s: number, u: any) => s + u.value, 0)} total</Badge>
              )}
            </div>
            <div className="p-4">
              <div className="h-[230px] w-full relative">
                {isLoading ? <Skeleton className="w-full h-full rounded-xl" /> : stats?.usersByRole && stats.usersByRole.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
                          </filter>
                        </defs>
                        <Pie
                          data={stats.usersByRole.map((u: any) => ({ ...u, name: u.name.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) }))}
                          cx="50%" cy="50%" innerRadius={62} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#fff"
                          cornerRadius={6}
                          label={({ cx, cy, midAngle, outerRadius: or, value }: any) => {
                            const RADIAN = Math.PI / 180;
                            const radius = or + 18;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            const total = stats.usersByRole.reduce((s: number, u: any) => s + u.value, 0);
                            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                            return <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[11px] font-bold">{pct}%</text>;
                          }}
                          labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                          style={{ filter: 'url(#pieShadow)' }}
                        >
                          {stats.usersByRole.map((_: any, i: number) => (
                            <Cell key={`cell-${i}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][i % 4]} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-2xl font-extrabold text-gray-900">{stats.usersByRole.reduce((s: number, u: any) => s + u.value, 0)}</p>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Users</p>
                      </div>
                    </div>
                  </>
                ) : <div className="text-center py-8"><p className="text-xs text-gray-400">No data.</p></div>}
              </div>
              {!isLoading && stats?.usersByRole && stats.usersByRole.length > 0 && (() => {
                const total = stats.usersByRole.reduce((s: number, u: any) => s + u.value, 0);
                const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
                const icons = [Stethoscope, Users, Building2, Shield];
                return (<div className="space-y-2 mt-2">{stats.usersByRole.map((entry: any, i: number) => {
                  const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                  const name = entry.name.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                  const Icon = icons[i % 4];
                  return (<div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50/80 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${colors[i % 4]}15` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: colors[i % 4] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">{name}</span>
                        <span className="text-xs font-bold text-gray-900">{entry.value}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: colors[i % 4] }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold w-8 text-right" style={{ color: colors[i % 4] }}>{pct}%</span>
                  </div>);
                })}</div>);
              })()}
            </div>
          </div>
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Quick Actions</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Manage platform resources</p>
                </div>
              </div>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Users", desc: `${stats?.totalUsers || 0} active`, icon: Users, href: "/admin/users", gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", border: "border-emerald-200/60", text: "text-emerald-700" },
                  { label: "Hospitals", desc: `${stats?.totalHospitals || 0} registered`, icon: Building2, href: "/admin/hospitals", gradient: "from-blue-500 to-indigo-600", bg: "bg-blue-50", border: "border-blue-200/60", text: "text-blue-700" },
                  { label: "Reports", desc: `${stats?.totalReports || 0} files`, icon: FileText, href: "/admin/settings", gradient: "from-violet-500 to-purple-600", bg: "bg-violet-50", border: "border-violet-200/60", text: "text-violet-700" },
                  { label: "Settings", desc: "Configure", icon: Settings, href: "/admin/settings", gradient: "from-amber-500 to-orange-600", bg: "bg-amber-50", border: "border-amber-200/60", text: "text-amber-700" },
                ].map((a) => (
                  <Link key={a.label} href={a.href}>
                    <div className={`group relative ${a.bg} border ${a.border} rounded-2xl p-4 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden`}>
                      <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-white/20 -translate-y-1/3 translate-x-1/3 group-hover:scale-150 transition-transform duration-500" />
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.gradient} flex items-center justify-center mb-3 shadow-lg shadow-black/10`}>
                        <a.icon className="w-4.5 h-4.5 text-white" />
                      </div>
                      <p className={`text-sm font-bold ${a.text} mb-0.5`}>{a.label}</p>
                      <p className="text-[10px] font-medium text-gray-400">{a.desc}</p>
                      <ArrowRight className={`w-3.5 h-3.5 ${a.text} opacity-0 group-hover:opacity-60 absolute bottom-4 right-4 transition-all duration-300 group-hover:translate-x-0.5`} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Live Platform Activity Feed ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-[15px]">Live Activity</h2>
              <p className="text-xs text-gray-400">Real-time platform events & updates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Live</span>
          </div>
        </div>
        <div className="p-5">
          {isLoading ? (
            <div className="flex gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 flex-1 rounded-xl" />)}</div>
          ) : logs.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
              {logs.map((log: any, i: number) => {
                let Icon = Activity;
                let colorClass = "bg-gray-50 text-gray-600 border-gray-200";
                let gradientClass = "from-gray-500 to-gray-600";
                
                let actionText = "System Event";
                const actionUpper = log.action?.toUpperCase() || "";
                const entityUpper = log.entity_type?.toUpperCase() || "";

                if (actionUpper.includes("REGISTER") || entityUpper === "HOSPITAL") {
                  Icon = Building2;
                  colorClass = "bg-indigo-50 text-indigo-600 border-indigo-200";
                  gradientClass = "from-indigo-500 to-blue-600";
                  actionText = "Hospital Registered";

                  if (actionUpper.includes("STATUS") || actionUpper.includes("UPDATE")) {
                    let statusStr = "";
                    try {
                      const nv = typeof log.new_values === 'string' ? JSON.parse(log.new_values) : log.new_values;
                      statusStr = nv?.status?.toUpperCase() || "";
                    } catch (e) {}

                    if (statusStr === "SUSPENDED" || statusStr === "SUSPEND") {
                      actionText = "Hospital Suspended";
                      colorClass = "bg-red-50 text-red-600 border-red-200";
                      gradientClass = "from-red-500 to-rose-600";
                    } else if (statusStr === "APPROVED" || statusStr === "ACTIVE") {
                      actionText = "Hospital Restored";
                      colorClass = "bg-emerald-50 text-emerald-600 border-emerald-200";
                      gradientClass = "from-emerald-500 to-teal-600";
                    } else if (statusStr === "REJECTED") {
                      actionText = "Hospital Rejected";
                      colorClass = "bg-orange-50 text-orange-600 border-orange-200";
                      gradientClass = "from-orange-500 to-red-600";
                    } else {
                       actionText = "Hospital Updated";
                    }
                  }
                } else if (actionUpper.includes("LOGIN") || entityUpper === "USER") {
                  Icon = Users;
                  colorClass = "bg-emerald-50 text-emerald-600 border-emerald-200";
                  gradientClass = "from-emerald-400 to-teal-500";
                  if (actionUpper.includes("LOGIN")) actionText = "User Logged In";
                  else if (actionUpper.includes("UPDATE")) actionText = "Profile Updated";
                  else actionText = "New User Joined";
                } else if (entityUpper === "APPOINTMENT") {
                  Icon = Calendar;
                  colorClass = "bg-amber-50 text-amber-600 border-amber-200";
                  gradientClass = "from-amber-400 to-orange-500";
                  if (actionUpper.includes("COMPLET")) actionText = "Consultation Completed";
                  else if (actionUpper.includes("CANCEL")) actionText = "Appointment Cancelled";
                  else actionText = "Appointment Booked";
                } else if (entityUpper === "REPORT" || actionUpper.includes("UPLOAD")) {
                  Icon = FileText;
                  colorClass = "bg-violet-50 text-violet-600 border-violet-200";
                  gradientClass = "from-violet-500 to-purple-600";
                  actionText = "Report Uploaded";
                } else {
                  Icon = Sparkles;
                  colorClass = "bg-blue-50 text-blue-600 border-blue-200";
                  gradientClass = "from-blue-400 to-cyan-500";
                  actionText = log.action || "Event Processed";
                }

                // Dynamically construct engaging messages from backend user data
                const userName = log.first_name ? `${log.first_name} ${log.last_name || ''}`.trim() : "";
                const message = userName ? `${userName} - ${actionText}` : actionText;
                
                return (
                  <div key={log.id || i} className="flex-1 min-w-[280px] max-w-[320px] snap-start group relative rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:border-gray-200 hover:-translate-y-1 transition-all duration-300 bg-gradient-to-b from-white to-gray-50/50">
                    <div className="flex items-start gap-3.5">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white shadow-md flex-shrink-0 relative overflow-hidden`}>
                         <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                        <Icon className="w-5 h-5 relative z-10" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-900 leading-snug mb-1.5 truncate group-hover:text-blue-600 transition-colors">{message}</p>
                        <div className="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 mt-1">
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${colorClass}`}>
                            {entityUpper || "SYSTEM"}
                          </span>
                          <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 shrink-0" /> {log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : "Just now"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8"><p className="text-xs text-gray-400">No recent activity.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
