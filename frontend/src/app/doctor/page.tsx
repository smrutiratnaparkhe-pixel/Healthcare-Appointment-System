"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { format, isToday } from "date-fns";
import {
  Activity, Calendar, Users, Clock, ChevronRight, CheckCircle2, FileText,
  TrendingUp, Stethoscope, ArrowRight, Sparkles, Play, MapPin, Shield,
  ClipboardList, Settings, Star, UserCheck, Plus, Zap
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { useAppointmentStore } from "@/store/useAppointmentStore";
import { toast } from "sonner";

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

/* ─── Main Dashboard ─── */
export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const { appointments, fetchAppointments, updateAppointment } = useAppointmentStore();
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async (silent = false) => {
      try {
        await fetchAppointments(1, 30, '', silent);
      } catch (e: any) {
        if (!silent) console.error("Failed to fetch appointments", e?.message || e);
      }

      try {
        const reportsRes: any = await api.get("/reports/shared?limit=5");
        setReports(reportsRes.data || []);
      } catch (e: any) {
        if (!silent) console.error("Failed to fetch shared reports", e?.message || e);
      }

      try {
        const statsRes: any = await api.get("/doctors/my-dashboard-stats");
        setStats(statsRes.data || null);
      } catch (e: any) {
        if (!silent) console.error("Failed to fetch doctor stats", e?.message || e);
      }

      if (!silent) setIsLoading(false);
    };
    fetchData();

    // Background polling every 10 seconds
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [user, fetchAppointments]);

  const updateStatus = async (id: number, statusId: number) => {
    try {
      await updateAppointment(id, statusId);
      toast.success("Appointment status updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const todaysAppts = useMemo(() => {
    return appointments.filter((a) => {
      const [year, month, day] = a.appointment_date.split('T')[0].split('-');
      const localDate = new Date(Number(year), Number(month) - 1, Number(day));
      return isToday(localDate);
    }).sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [appointments]);
  
  const upcomingAppts = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return appointments
      .filter((a) => {
        const [year, month, day] = a.appointment_date.split('T')[0].split('-');
        const apptDate = new Date(Number(year), Number(month) - 1, Number(day));
        return apptDate > today && (a.status_id === 1 || a.status_id === 2); // Future dates, pending/confirmed status
      })
      .sort((a, b) => {
        const [yA, mA, dA] = a.appointment_date.split('T')[0].split('-');
        const dateA = new Date(Number(yA), Number(mA) - 1, Number(dA));
        const [yB, mB, dB] = b.appointment_date.split('T')[0].split('-');
        const dateB = new Date(Number(yB), Number(mB) - 1, Number(dB));
        return dateA.getTime() - dateB.getTime();
      });
  }, [appointments]);

  const pendingCount = todaysAppts.filter((a) => a.status_id === 1).length;
  const inProgressCount = todaysAppts.filter((a) => a.status_id === 3).length;
  const completedCount = todaysAppts.filter((a) => a.status_id === 4).length;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const nextPending = todaysAppts.find((a) => a.status_id === 1);

  return (
    <div className="space-y-7 animate-in fade-in duration-500 pb-8">

      {/* ─── Hero Greeting ─── */}
      <div 
        className="relative overflow-hidden rounded-[24px] p-7 md:p-8 text-emerald-950 border border-emerald-100/50 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #E8FFF6 0%, #DDFBF4 100%)' }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/4 w-56 h-56 bg-emerald-400/5 rounded-full translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-emerald-600 text-sm font-semibold mb-1 uppercase tracking-wide">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2 text-emerald-900">{greeting}, Dr. {user?.lastName} 👋</h1>
            <p className="text-emerald-700/90 text-sm max-w-md font-medium">
              {nextPending
                ? `Your next patient is ${nextPending.patient_first_name} ${nextPending.patient_last_name} at ${nextPending.start_time?.substring(0, 5)}. You have ${pendingCount} pending consultation${pendingCount > 1 ? "s" : ""} today.`
                : todaysAppts.length > 0
                ? `You've completed all ${completedCount} consultation${completedCount > 1 ? "s" : ""} for today. Great work!`
                : "No consultations scheduled for today. Manage your availability or review patient records."}
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/doctor/schedule">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 rounded-xl h-10 px-5 font-bold text-sm transition-all active:scale-95">
                <Calendar className="w-4 h-4 mr-2" /> Manage Schedule
              </Button>
            </Link>
            <Button 
              onClick={async () => {
                try {
                  const newState = !stats?.isEmergencyEnabled;
                  await api.put('/doctors/my-profile/availability', { emergencyAvailability: newState });
                  setStats((prev: any) => ({ ...prev, isEmergencyEnabled: newState }));
                  toast.success(`Emergency mode turned ${newState ? 'ON' : 'OFF'}`);
                } catch(e) {
                  toast.error("Failed to toggle emergency mode");
                }
              }}
              className={`border hover:bg-white text-emerald-700 rounded-xl h-10 px-5 font-bold text-sm shadow-sm transition-all active:scale-95 ${stats?.isEmergencyEnabled ? 'bg-red-50 text-red-600 border-red-200 hover:text-red-700' : 'bg-white/60 backdrop-blur-sm border-emerald-200/60'}`}
            >
              <Zap className="w-4 h-4 mr-2" /> {stats?.isEmergencyEnabled ? "Emergency ON" : "Toggle Emergency"}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── KPI Stats Row ─── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Today's Patients", value: stats?.todaysTotal || 0, icon: Users, color: "emerald", sub: "Scheduled today" },
          { label: "Completed Today", value: stats?.completed || 0, icon: CheckCircle2, color: "blue", sub: "Consultations done" },
          { label: "Total Patients", value: stats?.totalPatients || 0, icon: Stethoscope, color: "violet", sub: "All time" },
          { label: "Pending Today", value: stats?.pending || 0, icon: Clock, color: "amber", sub: "Waiting to be seen" },
        ].map((kpi) => {
          const colors: Record<string, string> = {
            emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
            blue: "bg-blue-50 text-blue-600 border-blue-100",
            violet: "bg-violet-50 text-violet-600 border-violet-100",
            teal: "bg-teal-50 text-teal-600 border-teal-100",
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

        {/* ─── Left Column: Today's Schedule ─── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-[15px]">Today's Schedule</h2>
                  <p className="text-xs text-gray-400">
                    {todaysAppts.length > 0
                      ? `${pendingCount} pending · ${inProgressCount} in progress · ${completedCount} completed`
                      : "No consultations scheduled"}
                  </p>
                </div>
              </div>
              <Link href="/doctor/appointments">
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold">
                  View All <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="p-5">
              {isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
              ) : todaysAppts.length > 0 ? (
                <div className="space-y-3">
                  {todaysAppts.map((appt, idx) => {
                    const isPending = appt.status_id === 1;
                    const isInProgress = appt.status_id === 3;
                    const isCompleted = appt.status_id === 4;
                    return (
                      <div
                        key={appt.id}
                        className={`group relative flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                          isInProgress ? "border-amber-200 bg-amber-50/40" : isCompleted ? "border-emerald-100 bg-emerald-50/30" : "border-gray-100 bg-white hover:border-gray-200"
                        }`}
                      >
                        {/* Timeline dot */}
                        <div className="hidden sm:block absolute -left-[3px] top-1/2 -translate-y-1/2">
                          <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? "bg-emerald-400" : isInProgress ? "bg-amber-400" : "bg-gray-300"}`} />
                        </div>

                        {/* Time block */}
                        <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 ${
                          isInProgress ? "bg-amber-500 text-white" : isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-gray-50 text-gray-700 border border-gray-100"
                        }`}>
                          <Clock className="w-3 h-3 mb-0.5 opacity-60" />
                          <span className="text-sm font-bold">{appt.start_time?.substring(0, 5)}</span>
                        </div>

                        {/* Patient info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-gray-900 truncate">
                              {appt.patient_first_name} {appt.patient_last_name}
                            </h4>
                            {isInProgress && (
                              <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] px-1.5 py-0 h-4 animate-pulse">In Progress</Badge>
                            )}
                            {isCompleted && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] px-1.5 py-0 h-4">Done</Badge>
                            )}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mt-1.5 gap-4">
                            <span className="flex items-center gap-1 capitalize">
                              <Activity className="w-3 h-3" /> {appt.consultation_type?.replace("_", " ") || "Consultation"}
                            </span>
                            {appt.hospital_name && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3" /> {appt.hospital_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isPending && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-8 px-4 text-xs font-semibold shadow-sm shadow-emerald-500/20"
                              onClick={() => updateStatus(appt.id, 3)}
                            >
                              <Play className="w-3 h-3 mr-1.5" /> Start
                            </Button>
                          )}
                          {isInProgress && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-8 px-4 text-xs font-semibold shadow-sm shadow-blue-500/20"
                              onClick={() => updateStatus(appt.id, 4)}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1.5" /> Complete
                            </Button>
                          )}
                          {isCompleted && (
                            <div className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                    <Calendar className="w-7 h-7 text-gray-300" />
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 mb-1">No appointments today</h3>
                  <p className="text-xs text-gray-400 mb-5 max-w-[250px]">Enjoy your free time or set up your availability for upcoming days.</p>
                  <Link href="/doctor/schedule">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/20 h-9 px-5">
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Manage Schedule
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* ─── Upcoming Consultations (New Feature) ─── */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mt-6">
            <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-[15px]">Upcoming Consultations</h2>
                  <p className="text-xs text-gray-400">Scheduled for later this week</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              {isLoading ? (
                <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
              ) : upcomingAppts.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAppts.slice(0, 3).map((appt) => {
                    const [y, m, d] = appt.appointment_date.split('T')[0].split('-');
                    const localDate = new Date(Number(y), Number(m) - 1, Number(d));
                    return (
                    <div key={appt.id} className="group flex items-center gap-3.5 p-3.5 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all duration-200">
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 text-gray-600">
                        <span className="text-[10px] font-bold uppercase">{format(localDate, "MMM")}</span>
                        <span className="text-lg font-bold leading-none">{format(localDate, "d")}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {appt.patient_first_name} {appt.patient_last_name}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 mt-1 gap-3">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {appt.start_time?.substring(0, 5)}</span>
                          <span className="flex items-center gap-1 capitalize"><Activity className="w-3 h-3" /> {appt.consultation_type?.replace("_", " ")}</span>
                        </div>
                      </div>
                      <Badge className="bg-blue-50 text-blue-600 border-0 shadow-none hover:bg-blue-100 transition-colors">Upcoming</Badge>
                    </div>
                  )})}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-5 h-5 text-gray-300" />
                  </div>
                  <p className="text-xs text-gray-400">No upcoming consultations found.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right Column: Widgets ─── */}
        <div className="space-y-6">

          {/* Today's Progress */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-sm text-gray-900">Today's Progress</h3>
            </div>
            {isLoading ? <Skeleton className="h-4 w-full rounded-full" /> : (
              <>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>{completedCount} of {todaysAppts.length} completed</span>
                  <span className="font-bold text-emerald-600">
                    {todaysAppts.length > 0 ? Math.round((completedCount / todaysAppts.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${todaysAppts.length > 0 ? (completedCount / todaysAppts.length) * 100 : 0}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center p-2 bg-gray-50 rounded-xl">
                    <p className="text-lg font-bold text-gray-900">{pendingCount}</p>
                    <p className="text-[10px] text-gray-400 font-medium">Pending</p>
                  </div>
                  <div className="text-center p-2 bg-amber-50 rounded-xl">
                    <p className="text-lg font-bold text-amber-600">{inProgressCount}</p>
                    <p className="text-[10px] text-amber-500 font-medium">Active</p>
                  </div>
                  <div className="text-center p-2 bg-emerald-50 rounded-xl">
                    <p className="text-lg font-bold text-emerald-600">{completedCount}</p>
                    <p className="text-[10px] text-emerald-500 font-medium">Done</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Shared Reports */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-500" />
                <h3 className="font-semibold text-sm text-gray-900">Shared Reports</h3>
              </div>
            </div>
            <div className="px-5 pb-5">
              {isLoading ? (
                <div className="space-y-2.5">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
              ) : reports.length > 0 ? (
                <div className="space-y-2.5">
                  {reports.slice(0, 4).map((report) => (
                    <div key={report.id} className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all duration-200 cursor-pointer">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 flex items-center justify-center text-teal-500 flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{report.title}</p>
                        <p className="text-[11px] text-gray-400 truncate">{report.patient_first_name} {report.patient_last_name}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-teal-500 transition-colors" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-5 h-5 text-gray-300" />
                  </div>
                  <p className="text-xs text-gray-400">No reports shared recently.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-sm text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Schedule", icon: Calendar, href: "/doctor/schedule", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                { label: "Appointments", icon: ClipboardList, href: "/doctor/appointments", color: "bg-blue-50 text-blue-600 border-blue-100" },
                { label: "Patients", icon: Users, href: "/doctor/patients", color: "bg-violet-50 text-violet-600 border-violet-100" },
                { label: "Settings", icon: Settings, href: "/doctor/profile", color: "bg-amber-50 text-amber-600 border-amber-100" },
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

          {/* Health Tip */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <h3 className="font-semibold text-sm text-emerald-800">Clinical Tip</h3>
            </div>
            <p className="text-sm text-emerald-700 leading-relaxed">
              {[
                "Active listening during consultations improves patient outcomes by up to 30%.",
                "Document key findings immediately after each consultation for accurate records.",
                "Short breaks between patients help maintain diagnostic accuracy throughout the day.",
                "Clear communication of treatment plans significantly improves patient adherence.",
              ][new Date().getDay() % 4]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
