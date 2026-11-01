"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Users, Building2, Calendar, Activity, Clock, TrendingUp, Bell, FileText,
  Stethoscope, ChevronRight, ArrowRight, Settings, Star, Sparkles,
  Layers, Plus, UserCheck, BarChart3, ArrowUpRight
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useAppointmentStore } from "@/store/useAppointmentStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

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
  return <>{count}</>;
}

/* ─── Chart Tooltip ─── */
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-lg text-xs">
        <p className="font-bold text-gray-500 mb-1">{label}</p>
        {payload.map((e: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: e.color }} /> {e.name}</span>
            <span className="font-bold text-gray-900">{e.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function HospitalAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const { appointments, fetchAppointments } = useAppointmentStore();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuthStore();
  const hospitalId = (user as any)?.hospitalAdmin?.hospital_id || 1;
  const hospitalName = (user as any)?.hospitalAdmin?.hospital_name || "Hospital";

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchAppointments(1, 100, '', true);
        const [statsRes, hospitalRes]: any = await Promise.all([
          api.get(`/analytics/hospitals/${hospitalId}`),
          api.get(`/hospitals/${hospitalId}`),
        ]);
        setStats(statsRes.data);
        setDoctors(hospitalRes.data?.doctors || []);
        setDepartments(hospitalRes.data?.departments || []);
      } catch (error) {
        console.error("Failed to fetch hospital data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [hospitalId]);

  const todaysAppts = useMemo(() => {
    const nowStr = new Date().toDateString();
    return appointments.filter((a) => {
      const apptDateStr = typeof a.appointment_date === 'string' ? a.appointment_date.split('T')[0] : new Date(a.appointment_date).toISOString().split('T')[0];
      return new Date(`${apptDateStr}T00:00:00`).toDateString() === nowStr;
    });
  }, [appointments]);

  const upcomingAppts = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => ['pending', 'confirmed', 'rescheduled'].includes(a.status_name?.toLowerCase() || (a.status_id === 1 ? 'pending' : '')))
      .filter((a) => {
        const apptDateStr = typeof a.appointment_date === 'string' ? a.appointment_date.split('T')[0] : new Date(a.appointment_date).toISOString().split('T')[0];
        const start = a.start_time || '00:00';
        return new Date(`${apptDateStr}T${start}`) > now;
      })
      .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
      .slice(0, 4);
  }, [appointments]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const chartData = stats?.dailyAppointments || [];

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
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2 text-emerald-900">{greeting}! {hospitalName} 🏥</h1>
            <p className="text-emerald-700/90 text-sm max-w-lg font-medium">
              {todaysAppts.length > 0
                ? `You have ${todaysAppts.length} appointment${todaysAppts.length > 1 ? "s" : ""} today. ${doctors.length} doctor${doctors.length > 1 ? "s" : ""} currently active across ${departments.length} department${departments.length > 1 ? "s" : ""}.`
                : `Your hospital is running smoothly with ${doctors.length} active doctor${doctors.length > 1 ? "s" : ""} and ${departments.length} department${departments.length > 1 ? "s" : ""}.`}
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/hospital/doctors">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 rounded-xl h-10 px-5 font-bold text-sm transition-all active:scale-95">
                <Users className="w-4 h-4 mr-2" /> Manage Doctors
              </Button>
            </Link>
            <Link href="/hospital/appointments">
              <Button className="bg-white/60 backdrop-blur-sm text-emerald-700 border border-emerald-200/60 hover:bg-white hover:text-emerald-800 rounded-xl h-10 px-5 font-bold text-sm shadow-sm transition-all active:scale-95">
                <Calendar className="w-4 h-4 mr-2" /> Appointments
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── KPI Stats ─── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Appointments", value: stats?.total_appointments || 0, icon: Calendar, color: "emerald", sub: `${todaysAppts.length} today` },
          { label: "Active Doctors", value: stats?.total_doctors || 0, icon: Stethoscope, color: "blue", sub: "Available now" },
          { label: "Departments", value: stats?.total_departments || 0, icon: Layers, color: "violet", sub: "Active units" },
          { label: "Avg Rating", value: 0, displayValue: Number(stats?.avg_doctor_rating || 0).toFixed(1), icon: Star, color: "amber", sub: "Out of 5.0" },
        ].map((kpi) => {
          const colors: Record<string, string> = {
            emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
            blue: "bg-blue-50 text-blue-600 border-blue-100",
            violet: "bg-violet-50 text-violet-600 border-violet-100",
            amber: "bg-amber-50 text-amber-600 border-amber-100",
          };
          return (
            <div key={kpi.label} className="group relative bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{kpi.label}</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${colors[kpi.color]}`}>
                  <kpi.icon className="w-4 h-4" />
                </div>
              </div>
              {isLoading ? <Skeleton className="h-9 w-16 rounded-lg" /> : (
                <>
                  <div className="text-3xl font-bold text-gray-900 tracking-tight">
                    {(kpi as any).displayValue || <AnimatedNumber value={kpi.value} />}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Main Grid ─── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ─── Left: Appointments + Chart ─── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-[15px]">Upcoming Appointments</h2>
                  <p className="text-xs text-gray-400">Scheduled consultations</p>
                </div>
              </div>
              <Link href="/hospital/appointments">
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold">
                  View All <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="p-5">
              {isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
              ) : upcomingAppts.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAppts.map((appt) => {
                    const apptDateStr = typeof appt.appointment_date === 'string' ? appt.appointment_date.split('T')[0] : new Date(appt.appointment_date).toISOString().split('T')[0];
                    const apptDate = new Date(`${apptDateStr}T00:00:00`);
                    return (
                    <div key={appt.id} className="group flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 text-gray-600">
                        <span className="text-[10px] font-bold uppercase">{format(apptDate, "MMM")}</span>
                        <span className="text-xl font-bold leading-none">{format(apptDate, "d")}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {appt.patient_first_name} {appt.patient_last_name}
                        </h4>
                        <div className="flex items-center text-xs text-gray-500 mt-1 gap-3">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {appt.start_time?.substring(0, 5)}</span>
                          <span className="flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Dr. {appt.doctor_first_name} {appt.doctor_last_name}</span>
                        </div>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-600 border-0 shadow-none text-[10px] font-semibold">{appt.status_name}</Badge>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                    <Calendar className="w-6 h-6 text-gray-300" />
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 mb-1">No upcoming appointments</h3>
                  <p className="text-xs text-gray-400 max-w-[220px]">Appointments will appear here once patients book consultations.</p>
                </div>
              )}
            </div>
          </div>

          {/* Monthly Trends Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-[15px]">Daily Appointment Trends</h2>
                  <p className="text-xs text-gray-400">Last 14 days</p>
                </div>
              </div>
            </div>
            <div className="p-5 pt-3">
              <div className="h-[220px] w-full">
                {isLoading ? <Skeleton className="w-full h-full rounded-xl" /> : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => { const d = new Date(v); return format(d, "MMM d"); }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area type="monotone" dataKey="count" name="Appointments" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" animationDuration={1500} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">No appointment data yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right Column ─── */}
        <div className="space-y-6">

          {/* Active Doctors */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <h3 className="font-semibold text-sm text-gray-900">Active Doctors</h3>
              </div>
              <Link href="/hospital/doctors">
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-semibold h-7 px-2">
                  View All
                </Button>
              </Link>
            </div>
            <div className="px-5 pb-5">
              {isLoading ? (
                <div className="space-y-2.5">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
              ) : doctors.length > 0 ? (
                <div className="space-y-2.5">
                  {doctors.slice(0, 4).map((doc) => (
                    <div key={doc.id} className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {doc.first_name?.charAt(0)}{doc.last_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">Dr. {doc.first_name} {doc.last_name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{doc.specialties || doc.qualification}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-amber-500">
                        <Star className="w-3 h-3 fill-current" /> {doc.rating || "New"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Stethoscope className="w-5 h-5 text-gray-300" />
                  </div>
                  <p className="text-xs text-gray-400">No doctors onboarded yet.</p>
                  <Link href="/hospital/doctors">
                    <Button size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-8 px-4">
                      <Plus className="w-3 h-3 mr-1" /> Add Doctor
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-sm text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Doctors", icon: Users, href: "/hospital/doctors", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                { label: "Departments", icon: Layers, href: "/hospital/departments", color: "bg-blue-50 text-blue-600 border-blue-100" },
                { label: "Appointments", icon: Calendar, href: "/hospital/appointments", color: "bg-violet-50 text-violet-600 border-violet-100" },
                { label: "Settings", icon: Settings, href: "/hospital/settings", color: "bg-amber-50 text-amber-600 border-amber-100" },
              ].map((a) => (
                <Link key={a.label} href={a.href}>
                  <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${a.color}`}>
                    <a.icon className="w-5 h-5" />
                    <span className="text-xs font-semibold">{a.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Departments */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-500" />
                <h3 className="font-semibold text-sm text-gray-900">Departments</h3>
              </div>
            </div>
            <div className="px-5 pb-5">
              {isLoading ? (
                <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
              ) : departments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {departments.map((d) => (
                    <Badge key={d.id} variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 rounded-lg py-1.5 px-3 text-xs font-semibold hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-colors cursor-default">
                      {d.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-400">No departments created yet.</p>
                  <Link href="/hospital/departments">
                    <Button size="sm" variant="outline" className="mt-3 rounded-xl text-xs h-8 px-4 border-gray-200">
                      <Plus className="w-3 h-3 mr-1" /> Add Department
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Platform Tip */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <h3 className="font-semibold text-sm text-emerald-800">Management Tip</h3>
            </div>
            <p className="text-sm text-emerald-700 leading-relaxed">
              {[
                "Regularly reviewing doctor availability helps optimize appointment scheduling and patient satisfaction.",
                "Maintaining updated department information improves patient routing and reduces wait times.",
                "Monitor your hospital rating closely — it directly impacts patient trust and booking rates.",
                "Onboarding specialized doctors in high-demand areas can significantly boost your appointment volume.",
              ][new Date().getDay() % 4]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
