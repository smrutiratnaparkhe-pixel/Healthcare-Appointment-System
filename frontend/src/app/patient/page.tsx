"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import {
  Activity, Calendar, FileText, Clock, ChevronRight, MapPin, Heart,
  TrendingUp, Shield, Stethoscope, ArrowRight, Sparkles, Bell,
  Star, Upload, Search, Plus
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { useAppointmentStore } from "@/store/useAppointmentStore";

/* ─── Animated Counter ─── */
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (value === 0) { setCount(0); return; }
    let start = 0;
    const step = Math.max(1, Math.floor(value / (duration / 30)));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{count}</>;
}

/* ─── Health Score Ring ─── */
function HealthScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-28 h-28">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{score}</span>
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ─── */
export default function PatientDashboard() {
  const { user } = useAuthStore();
  const { appointments, fetchAppointments } = useAppointmentStore();
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchAppointments(1, 50, '', true);
        const [reportsRes, statsRes]: any = await Promise.all([
          api.get("/reports/my?limit=5"),
          api.get("/analytics/patients/my-stats"),
        ]);
        setReports(reportsRes.data || []);
        setStats(statsRes.data || null);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const upcomingAppts = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => ['pending', 'confirmed', 'rescheduled'].includes(a.status_name?.toLowerCase() || (a.status_id === 1 ? 'pending' : '')))
      .filter((a) => {
        const apptDateStr = typeof a.appointment_date === 'string' ? a.appointment_date.split('T')[0] : new Date(a.appointment_date).toISOString().split('T')[0];
        const start = a.start_time || '00:00';
        return new Date(`${apptDateStr}T${start}`) > now;
      })
      .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
  }, [appointments]);

  const completedAppts = useMemo(() => {
    const now = new Date();
    return appointments.filter((a) => {
      if (a.status_id === 4 || (a.status_name && a.status_name.toLowerCase() === 'completed')) return true;
      const apptDateStr = typeof a.appointment_date === 'string' ? a.appointment_date.split('T')[0] : new Date(a.appointment_date).toISOString().split('T')[0];
      const start = a.start_time || '00:00';
      return new Date(`${apptDateStr}T${start}`) <= now;
    });
  }, [appointments]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Computed health score based on real data
  const healthScore = useMemo(() => {
    if (!stats) return 0;
    let score = 50; // Base score
    if (stats.completedConsultations > 0) score += 15;
    if (stats.totalReports > 0) score += 15;
    if (stats.upcomingAppointments > 0) score += 10;
    if (stats.completedConsultations >= 3) score += 10;
    return Math.min(score, 100);
  }, [stats]);

  const profileCompletion = useMemo(() => {
    if (!user) return 0;
    let filled = 0;
    const fields = [user.firstName, user.lastName, user.email, user.phone, user.patient?.blood_group, user.patient?.emergency_contact_name];
    fields.forEach((f) => { if (f) filled++; });
    return Math.round((filled / fields.length) * 100);
  }, [user]);

  const nextAppt = upcomingAppts[0];

  return (
    <div className="space-y-7 animate-in fade-in duration-500 pb-8">

      {/* ─── Hero Greeting ─── */}
      <div 
        className="relative overflow-hidden rounded-[24px] p-7 md:p-8 text-emerald-950 border border-emerald-100/50 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #E8FFF6 0%, #DDFBF4 100%)' }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-400/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-emerald-400/5 rounded-full translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-emerald-600 text-sm font-semibold mb-1 uppercase tracking-wide">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2 text-emerald-900">{greeting}, {user?.firstName} 👋</h1>
            <p className="text-emerald-700/90 text-sm max-w-md font-medium">
              {nextAppt
                ? `You have an appointment with Dr. ${nextAppt.doctor_first_name} ${nextAppt.doctor_last_name} ${isToday(new Date(`${typeof nextAppt.appointment_date === 'string' ? nextAppt.appointment_date.split('T')[0] : nextAppt.appointment_date}T00:00:00`)) ? "today" : isTomorrow(new Date(`${typeof nextAppt.appointment_date === 'string' ? nextAppt.appointment_date.split('T')[0] : nextAppt.appointment_date}T00:00:00`)) ? "tomorrow" : `on ${format(new Date(`${typeof nextAppt.appointment_date === 'string' ? nextAppt.appointment_date.split('T')[0] : nextAppt.appointment_date}T00:00:00`), "MMM d")}`} at ${nextAppt.start_time?.substring(0, 5)}.`
                : "Your health dashboard is looking good. Stay on top of your wellness!"}
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/discover">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 rounded-xl h-10 px-5 font-bold text-sm transition-all active:scale-95">
                <Search className="w-4 h-4 mr-2" /> Find Care
              </Button>
            </Link>
            <Link href="/patient/reports">
              <Button className="bg-white/60 backdrop-blur-sm text-emerald-700 border border-emerald-200/60 hover:bg-white hover:text-emerald-800 rounded-xl h-10 px-5 font-bold text-sm shadow-sm transition-all active:scale-95">
                <Upload className="w-4 h-4 mr-2" /> Upload Report
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── KPI Stats Row ─── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Upcoming Visits", value: stats?.upcomingAppointments || 0, icon: Calendar, color: "emerald", sub: "Scheduled" },
          { label: "Consultations", value: stats?.completedConsultations || 0, icon: Stethoscope, color: "blue", sub: "Completed" },
          { label: "Medical Reports", value: stats?.totalReports || 0, icon: FileText, color: "violet", sub: "Stored securely" },
          { label: "Total Visits", value: stats?.totalAppointments || 0, icon: TrendingUp, color: "amber", sub: "All time" },
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
                  <div className="text-3xl font-bold text-gray-900 tracking-tight"><AnimatedNumber value={kpi.value} /></div>
                  <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Main Content Grid ─── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ─── Left Column: Appointments ─── */}
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
                  <p className="text-xs text-gray-400">Your next scheduled visits</p>
                </div>
              </div>
              <Link href="/patient/appointments">
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold">
                  View All <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="p-5">
              {isLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
              ) : upcomingAppts.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAppts.slice(0, 4).map((appt, idx) => {
                    const apptDateStr = typeof appt.appointment_date === 'string' ? appt.appointment_date.split('T')[0] : new Date(appt.appointment_date).toISOString().split('T')[0];
                    const apptDate = new Date(`${apptDateStr}T00:00:00`);
                    const isApptToday = isToday(apptDate);
                    return (
                      <div key={appt.id} className={`group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${isApptToday ? "border-emerald-200 bg-emerald-50/50" : "border-gray-100 bg-white hover:border-gray-200"}`}
                        style={{ animationDelay: `${idx * 80}ms` }}
                      >
                        <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 ${isApptToday ? "bg-emerald-500 text-white" : "bg-gray-50 text-gray-700 border border-gray-100"}`}>
                          <span className="text-[10px] font-bold uppercase">{format(apptDate, "MMM")}</span>
                          <span className="text-xl font-bold leading-none">{format(apptDate, "d")}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-gray-900 truncate">Dr. {appt.doctor_first_name} {appt.doctor_last_name}</h4>
                            {isApptToday && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] px-1.5 py-0 h-4">Today</Badge>}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mt-1.5 gap-4">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {appt.start_time?.substring(0, 5)}</span>
                            <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" /> {appt.hospital_name || "Online"}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                    <Calendar className="w-7 h-7 text-gray-300" />
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 mb-1">No upcoming appointments</h3>
                  <p className="text-xs text-gray-400 mb-5 max-w-[220px]">Book your next consultation with a healthcare professional.</p>
                  <Link href="/discover">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/20 h-9 px-5">
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Book Appointment
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Reports */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-[15px]">Recent Reports</h2>
                  <p className="text-xs text-gray-400">Your latest medical documents</p>
                </div>
              </div>
              <Link href="/patient/reports">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-semibold">
                  View All <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="p-5">
              {isLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
              ) : reports.length > 0 ? (
                <div className="space-y-2.5">
                  {reports.slice(0, 4).map((report) => (
                    <div key={report.id} className="group flex items-center gap-3.5 p-3.5 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all duration-200 cursor-pointer">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-blue-500 flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{report.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {format(new Date(report.report_date || report.created_at), "MMM d, yyyy")} · {report.report_type?.replace("_", " ")}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                    <FileText className="w-7 h-7 text-gray-300" />
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 mb-1">No reports yet</h3>
                  <p className="text-xs text-gray-400 mb-5 max-w-[220px]">Upload your medical reports to keep track of your health.</p>
                  <Link href="/patient/reports">
                    <Button size="sm" variant="outline" className="rounded-xl h-9 px-5 border-gray-200">
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Report
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right Column: Widgets ─── */}
        <div className="space-y-6">

          {/* Health Score Widget */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Heart className="w-4 h-4 text-emerald-500" />
              <h3 className="font-semibold text-sm text-gray-900">Health Score</h3>
            </div>
            {isLoading ? <Skeleton className="w-28 h-28 rounded-full mx-auto" /> : (
              <div className="flex justify-center mb-4">
                <HealthScoreRing score={healthScore} />
              </div>
            )}
            <p className="text-xs text-gray-400 max-w-[200px] mx-auto">
              {healthScore >= 80 ? "Excellent! You're actively managing your health." :
               healthScore >= 60 ? "Good progress. Keep up with your check-ups!" :
               "Complete your profile and book a consultation to improve."}
            </p>
          </div>

          {/* Profile Completion */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-gray-900">Profile Completion</h3>
              <span className="text-xs font-bold text-emerald-600">{profileCompletion}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${profileCompletion}%` }} />
            </div>
            <p className="text-xs text-gray-400 mb-3">
              {profileCompletion < 100 ? "Complete your profile for better care recommendations." : "Your profile is fully complete!"}
            </p>
            {profileCompletion < 100 && (
              <Link href="/patient/profile">
                <Button variant="outline" size="sm" className="w-full rounded-xl border-gray-200 text-xs h-9 font-semibold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200">
                  Complete Profile <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-sm text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Find Doctors", icon: Search, href: "/discover", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                { label: "Appointments", icon: Calendar, href: "/patient/appointments", color: "bg-blue-50 text-blue-600 border-blue-100" },
                { label: "My Reports", icon: FileText, href: "/patient/reports", color: "bg-violet-50 text-violet-600 border-violet-100" },
                { label: "Settings", icon: Shield, href: "/patient/profile", color: "bg-amber-50 text-amber-600 border-amber-100" },
              ].map((action) => (
                <Link key={action.label} href={action.href}>
                  <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${action.color}`}>
                    <action.icon className="w-5 h-5" />
                    <span className="text-xs font-semibold">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Health Tips */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <h3 className="font-semibold text-sm text-emerald-800">Health Tip</h3>
            </div>
            <p className="text-sm text-emerald-700 leading-relaxed">
              {[
                "Stay hydrated! Aim to drink at least 8 glasses of water daily for optimal health.",
                "Regular check-ups can help detect potential health issues early. Book your next visit today!",
                "A balanced diet rich in fruits and vegetables boosts your immune system significantly.",
                "Quality sleep of 7-9 hours is essential for physical recovery and mental clarity.",
              ][new Date().getDay() % 4]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
