"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar, Search, Loader2, Clock, User, Stethoscope,
  CheckCircle2, XCircle, AlertCircle, MoreVertical, Eye,
  CalendarDays, Activity, TrendingUp, Users, Filter, ChevronDown
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface Appointment {
  id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  notes: string | null;
  consultation_type: string;
  cancellation_reason: string | null;
  created_at: string;
  status_id: number;
  status_name: string;
  status_color: string;
  doctor_first_name: string;
  doctor_last_name: string;
  doctor_avatar: string | null;
  patient_first_name: string;
  patient_last_name: string;
  patient_phone: string | null;
  patient_email: string | null;
  department_name: string | null;
}

interface Stats {
  total: number;
  today: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

interface Department { id: number; name: string; }
interface Doctor { id: number; first_name: string; last_name: string; }

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  pending:     { label: "Pending",     bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200", icon: Clock },
  confirmed:   { label: "Confirmed",   bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",  icon: CheckCircle2 },
  in_progress: { label: "In Progress", bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200",icon: Activity },
  completed:   { label: "Completed",   bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200",icon: CheckCircle2 },
  cancelled:   { label: "Cancelled",   bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",   icon: XCircle },
  no_show:     { label: "No Show",     bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200",icon: AlertCircle },
  rescheduled: { label: "Rescheduled", bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",icon: Calendar },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");

  // Detail dialog
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (dateFilter) params.append("date", dateFilter);
      if (deptFilter) params.append("departmentId", deptFilter);
      if (doctorFilter) params.append("doctorId", doctorFilter);
      if (searchQuery) params.append("search", searchQuery);

      const [apptRes, statsRes, deptRes, docRes]: any[] = await Promise.all([
        api.get(`/hospital-manage/appointments?${params.toString()}`),
        api.get("/hospital-manage/appointments/stats"),
        api.get("/hospital-manage/departments"),
        api.get("/hospital-manage/doctors"),
      ]);

      setAppointments(apptRes.data || []);
      setStats(statsRes.data || { total: 0, today: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 });
      setDepartments(deptRes.data || []);
      setDoctors(docRes.data || []);
    } catch { toast.error("Failed to load appointments"); }
    finally { setIsLoading(false); }
  }, [statusFilter, dateFilter, deptFilter, doctorFilter, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (apptId: number, statusId: number, reason?: string) => {
    try {
      const body: any = { statusId };
      if (reason) body.cancellationReason = reason;
      await api.put(`/hospital-manage/appointments/${apptId}/status`, body);
      toast.success("Appointment updated");
      fetchData();
      setDetailOpen(false);
    } catch (err: any) { toast.error(err.message || "Update failed"); }
  };

  const formatDate = (d: string) => {
    try { 
      const dateStr = typeof d === 'string' ? d.split('T')[0] : new Date(d).toISOString().split('T')[0];
      return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); 
    }
    catch { return d; }
  };

  const formatTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  };

  const getStatusConfig = (name: string) => STATUS_CONFIG[name] || STATUS_CONFIG.pending;

  const statCards = [
    { label: "Total", value: stats.total, icon: CalendarDays, color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200" },
    { label: "Today", value: stats.today, icon: Activity, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    { label: "Confirmed", value: stats.confirmed, icon: CheckCircle2, color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
    { label: "Completed", value: stats.completed, icon: TrendingUp, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "Cancelled", value: stats.cancelled, icon: XCircle, color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500">Manage, monitor, and track all hospital appointments.</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className={`rounded-2xl ${s.bg} border ${s.border} shadow-none`}>
              <CardContent className="px-4 py-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</span>
                  <Icon className={`w-4 h-4 ${s.color} opacity-60`} />
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border-gray-100/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by patient or doctor name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl border-gray-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 inline-flex items-center gap-2 hover:bg-gray-50 focus:outline-none min-w-[120px]">
                  <Filter className="w-3.5 h-3.5" />
                  {statusFilter === "all" ? "All Status" : getStatusConfig(statusFilter).label}
                  <ChevronDown className="w-3.5 h-3.5 ml-auto text-gray-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-gray-100 min-w-[150px]">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")} className="cursor-pointer">All Status</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)} className="cursor-pointer">
                      <span className={`w-2 h-2 rounded-full ${cfg.bg} ${cfg.border} border mr-2`} />
                      {cfg.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Date Filter */}
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-ring"
              />

              {/* Department Filter */}
              {departments.length > 0 && (
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-ring min-w-[140px]"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}

              {/* Clear Filters */}
              {(statusFilter !== "all" || dateFilter || deptFilter || doctorFilter || searchQuery) && (
                <Button variant="outline" className="h-10 rounded-xl text-sm" onClick={() => {
                  setStatusFilter("all"); setDateFilter(""); setDeptFilter(""); setDoctorFilter(""); setSearchQuery("");
                }}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : appointments.length === 0 ? (
        <Card className="rounded-[20px] border-gray-100/60 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 border border-gray-100">
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No appointments found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your filters or check back later.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-gray-100/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left py-3.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">ID</th>
                  <th className="text-left py-3.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Patient</th>
                  <th className="text-left py-3.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Doctor</th>
                  <th className="text-left py-3.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Department</th>
                  <th className="text-left py-3.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date & Time</th>
                  <th className="text-left py-3.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Type</th>
                  <th className="text-left py-3.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right py-3.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => {
                  const sc = getStatusConfig(appt.status_name);
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={appt.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors group">
                      <td className="py-3.5 px-4 text-gray-400 font-mono text-xs">#{appt.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-8 h-8 rounded-lg">
                            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-lg text-[10px] font-bold">
                              {appt.patient_first_name?.charAt(0)}{appt.patient_last_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gray-900 text-[13px]">{appt.patient_first_name} {appt.patient_last_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-8 h-8 rounded-lg">
                            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-lg text-[10px] font-bold">
                              {appt.doctor_first_name?.charAt(0)}{appt.doctor_last_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-gray-700 text-[13px]">Dr. {appt.doctor_first_name} {appt.doctor_last_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-gray-600 text-[13px]">{appt.department_name || "—"}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-[13px]">
                          <div className="font-medium text-gray-800">{formatDate(appt.appointment_date)}</div>
                          <div className="text-gray-400 text-xs">{formatTime(appt.start_time)} – {formatTime(appt.end_time)}</div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge className="bg-gray-50 text-gray-600 border border-gray-200 shadow-none text-[10px] font-semibold uppercase tracking-wider hover:bg-gray-50 rounded-md">
                          {(appt.consultation_type || "in_person").replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge className={`${sc.bg} ${sc.text} ${sc.border} border shadow-none text-[10px] font-bold uppercase tracking-wider rounded-md hover:${sc.bg}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {sc.label}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-full inline-flex items-center justify-center hover:bg-gray-100 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-gray-100 min-w-[160px]">
                            <DropdownMenuItem onClick={() => { setSelectedAppt(appt); setDetailOpen(true); }} className="cursor-pointer">
                              <Eye className="w-4 h-4 mr-2 text-gray-400" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {appt.status_name === "pending" && (
                              <DropdownMenuItem onClick={() => updateStatus(appt.id, 2)} className="cursor-pointer text-blue-600 focus:text-blue-600 focus:bg-blue-50">
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm
                              </DropdownMenuItem>
                            )}
                            {(appt.status_name === "confirmed" || appt.status_name === "in_progress") && (
                              <DropdownMenuItem onClick={() => updateStatus(appt.id, 4)} className="cursor-pointer text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50">
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Complete
                              </DropdownMenuItem>
                            )}
                            {appt.status_name !== "cancelled" && appt.status_name !== "completed" && (
                              <DropdownMenuItem onClick={() => updateStatus(appt.id, 5, "Cancelled by hospital admin")} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                                <XCircle className="w-4 h-4 mr-2" /> Cancel
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30">
            <p className="text-xs text-gray-400">Showing {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}</p>
          </div>
        </Card>
      )}

      {/* Appointment Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Appointment #{selectedAppt?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedAppt && (() => {
            const sc = getStatusConfig(selectedAppt.status_name);
            const StatusIcon = sc.icon;
            return (
              <div className="space-y-5 py-2">
                {/* Status */}
                <div className="flex items-center gap-3">
                  <Badge className={`${sc.bg} ${sc.text} ${sc.border} border shadow-none text-xs font-bold uppercase tracking-wider rounded-lg px-3 py-1.5 hover:${sc.bg}`}>
                    <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                    {sc.label}
                  </Badge>
                  <Badge className="bg-gray-50 text-gray-600 border border-gray-200 shadow-none text-xs font-semibold rounded-lg px-3 py-1.5 uppercase hover:bg-gray-50">
                    {(selectedAppt.consultation_type || "in_person").replace("_", " ")}
                  </Badge>
                </div>

                {/* Date & Time */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <CalendarDays className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{formatDate(selectedAppt.appointment_date)}</p>
                      <p className="text-sm text-gray-500">{formatTime(selectedAppt.start_time)} – {formatTime(selectedAppt.end_time)}</p>
                    </div>
                  </div>
                </div>

                {/* Patient Info */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Patient</label>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 rounded-xl">
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-xl text-sm font-bold">
                        {selectedAppt.patient_first_name?.charAt(0)}{selectedAppt.patient_last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedAppt.patient_first_name} {selectedAppt.patient_last_name}</p>
                      {selectedAppt.patient_email && <p className="text-xs text-gray-500">{selectedAppt.patient_email}</p>}
                      {selectedAppt.patient_phone && <p className="text-xs text-gray-500">{selectedAppt.patient_phone}</p>}
                    </div>
                  </div>
                </div>

                {/* Doctor Info */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Doctor</label>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 rounded-xl">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-xl text-sm font-bold">
                        {selectedAppt.doctor_first_name?.charAt(0)}{selectedAppt.doctor_last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900">Dr. {selectedAppt.doctor_first_name} {selectedAppt.doctor_last_name}</p>
                      {selectedAppt.department_name && <p className="text-xs text-gray-500">{selectedAppt.department_name}</p>}
                    </div>
                  </div>
                </div>

                {/* Reason / Notes - HIDDEN FOR PRIVACY */}
                <div className="bg-gray-50/50 border border-gray-100 border-dashed rounded-xl p-4 flex items-center justify-center">
                  <p className="text-xs text-gray-400 font-medium italic flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                    Clinical details (reason & notes) are hidden to maintain patient privacy (PHI).
                  </p>
                </div>
                {selectedAppt.cancellation_reason && (
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Cancellation Reason</label>
                    <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3 border border-red-100">{selectedAppt.cancellation_reason}</p>
                  </div>
                )}

                <div className="text-xs text-gray-400 pt-1">
                  Created: {formatDate(selectedAppt.created_at)}
                </div>

                {/* Action Buttons */}
                {selectedAppt.status_name !== "completed" && selectedAppt.status_name !== "cancelled" && (
                  <div className="flex gap-2 pt-2">
                    {selectedAppt.status_name === "pending" && (
                      <Button onClick={() => updateStatus(selectedAppt.id, 2)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm
                      </Button>
                    )}
                    {(selectedAppt.status_name === "confirmed" || selectedAppt.status_name === "in_progress") && (
                      <Button onClick={() => updateStatus(selectedAppt.id, 4)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Complete
                      </Button>
                    )}
                    <Button onClick={() => updateStatus(selectedAppt.id, 5, "Cancelled by hospital admin")} variant="outline" className="flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                      <XCircle className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
