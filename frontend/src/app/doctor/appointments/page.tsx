"use client";

import { useEffect, useState } from "react";
import { useAppointmentStore } from "@/store/useAppointmentStore";
import { 
  Calendar as CalendarIcon, Clock, MapPin, Search, Filter, 
  ChevronRight, MoreVertical, AlertCircle, CheckCircle2, 
  XCircle, Video, FileText, ArrowRight, X, User, ClipboardList, Check
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isFuture, isPast, parseISO, isToday } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

export default function DoctorAppointments() {
  const { appointments, isLoading, fetchAppointments, cancelAppointment, updateAppointment } = useAppointmentStore();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Complete Notes Modal
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState("");

  useEffect(() => {
    fetchAppointments();
    
    // Background polling every 10 seconds for real-time updates
    const intervalId = setInterval(() => {
      fetchAppointments(1, 50, '', true);
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, [fetchAppointments]);

  // Filter logic
  const now = new Date();
  
  const upcomingAppointments = appointments
    .filter(a => ['pending', 'confirmed', 'rescheduled'].includes(a.status_name.toLowerCase()))
    .filter(a => parseISO(`${a.appointment_date.split('T')[0]}T${a.start_time}`) > now || a.status_name.toLowerCase() !== 'completed')
    .filter(a => !['completed', 'cancelled'].includes(a.status_name.toLowerCase()))
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

  const historyAppointments = appointments
    .filter(a => ['completed', 'cancelled'].includes(a.status_name.toLowerCase()) || 
                 (parseISO(`${a.appointment_date.split('T')[0]}T${a.start_time}`) < now && !['pending', 'confirmed'].includes(a.status_name.toLowerCase())))
    .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());

  const displayedAppointments = activeTab === 'upcoming' ? upcomingAppointments : historyAppointments;

  const filteredAppointments = displayedAppointments.filter(app => {
    const patName = `${app.patient_first_name} ${app.patient_last_name}`.toLowerCase();
    const q = searchQuery.toLowerCase();
    return patName.includes(q) || (app.reason && app.reason.toLowerCase().includes(q)) || app.status_name.toLowerCase().includes(q);
  });

  // Stats
  const statUpcoming = upcomingAppointments.length;
  const statToday = upcomingAppointments.filter(a => isToday(parseISO(a.appointment_date.split('T')[0]))).length;
  const statCompleted = appointments.filter(a => a.status_name.toLowerCase() === 'completed').length;
  const statCancelled = appointments.filter(a => a.status_name.toLowerCase() === 'cancelled').length;

  const getStatusIcon = (status: string) => {
    switch(status.toLowerCase()) {
      case 'confirmed': return <CheckCircle2 className="w-3.5 h-3.5 mr-1" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5 mr-1" />;
      case 'pending': return <Clock className="w-3.5 h-3.5 mr-1" />;
      case 'completed': return <Check className="w-3.5 h-3.5 mr-1" />;
      default: return null;
    }
  };

  const handleCancelClick = (id: number) => {
    setSelectedAppointmentId(id);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const submitCancel = async () => {
    if (!selectedAppointmentId) return;
    setIsProcessing(true);
    try {
      await cancelAppointment(selectedAppointmentId, cancelReason || "Cancelled by doctor");
      setCancelModalOpen(false);
      toast.success("Appointment cancelled");
    } catch (error) {
      toast.error("Failed to cancel appointment");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (id: number, statusId: number, actionName: string) => {
    setIsProcessing(true);
    try {
      await updateAppointment(id, statusId);
      toast.success(`Appointment ${actionName} successfully`);
    } catch (error) {
      toast.error(`Failed to ${actionName} appointment`);
    } finally {
      setIsProcessing(false);
    }
  };

  const openCompleteModal = (id: number) => {
    setSelectedAppointmentId(id);
    setClinicalNotes("");
    setNotesModalOpen(true);
  };

  const submitComplete = async () => {
    if (!selectedAppointmentId) return;
    setIsProcessing(true);
    try {
      await updateAppointment(selectedAppointmentId, 4, clinicalNotes); // 4 = Completed
      setNotesModalOpen(false);
      toast.success("Appointment marked as completed");
    } catch (error) {
      toast.error("Failed to complete appointment");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Patient Appointments</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage your schedule, view patient bookings, and update consultation statuses.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "UPCOMING", value: statUpcoming, color: "text-[#10b981]", bg: "bg-[#10b981]/10" },
          { label: "TODAY", value: statToday, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "COMPLETED", value: statCompleted, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "CANCELLED", value: statCancelled, color: "text-red-500", bg: "bg-red-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${stat.bg} ${stat.color}`}>
              {stat.value}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 tracking-wider mb-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Card className="border-0 shadow-sm rounded-3xl overflow-hidden bg-white/50 backdrop-blur-xl">
        <div className="border-b border-gray-100 bg-white p-4 sm:p-6 pb-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex bg-gray-100/80 p-1.5 rounded-xl self-stretch sm:self-auto">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'upcoming' ? 'bg-[#10b981] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}`}
              >
                Upcoming ({upcomingAppointments.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}`}
              >
                History
              </button>
            </div>
            <div className="relative w-full sm:w-72 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-[#10b981] transition-colors" />
              <input 
                type="text" 
                placeholder="Search patient or reason..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all bg-white"
              />
            </div>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 bg-gray-50/30">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-3xl border border-gray-100 border-dashed">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <CalendarIcon className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No {activeTab} appointments</h3>
              <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto">
                {searchQuery ? "We couldn't find any appointments matching your search." : "You don't have any appointments in this category right now."}
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredAppointments.map((app) => (
                <div key={app.id} className={`flex flex-col md:flex-row gap-6 p-5 sm:p-6 rounded-2xl border transition-all hover:shadow-md ${app.status_name.toLowerCase() === 'cancelled' ? 'bg-gray-50/80 border-gray-100 opacity-75' : 'bg-white border-gray-200 shadow-sm'}`}>
                  
                  {/* Left: Date & Time */}
                  <div className="flex flex-row md:flex-col items-center md:items-start justify-between md:justify-center md:w-32 md:border-r border-gray-100 md:pr-6 shrink-0">
                    <div className="text-center md:text-left">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {format(parseISO(app.appointment_date.split('T')[0]), 'MMM')}
                      </p>
                      <p className={`text-3xl font-black ${app.status_name.toLowerCase() === 'cancelled' ? 'text-gray-400' : 'text-gray-900'}`}>
                        {format(parseISO(app.appointment_date.split('T')[0]), 'dd')}
                      </p>
                      <p className="text-xs font-semibold text-gray-500 mt-1">
                        {format(parseISO(app.appointment_date.split('T')[0]), 'EEEE')}
                      </p>
                    </div>
                    <div className="md:mt-4 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700">
                      <Clock className="w-3.5 h-3.5" />
                      {app.start_time.substring(0, 5)}
                    </div>
                  </div>

                  {/* Middle: Info */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 rounded-2xl border-2 border-white shadow-sm ring-1 ring-gray-100">
                          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-xl rounded-2xl">
                            {app.patient_first_name?.charAt(0)}{app.patient_last_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className={`text-lg font-bold tracking-tight ${app.status_name.toLowerCase() === 'cancelled' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {app.patient_first_name} {app.patient_last_name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-semibold text-[#10b981] flex items-center gap-1">
                              {app.consultation_type === 'online' ? <Video className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                              {app.consultation_type === 'online' ? 'Online Consultation' : 'In-Person Visit'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`font-bold px-3 py-1 border-0 shadow-sm flex items-center gap-1.5 capitalize text-xs rounded-lg`}
                        style={{ backgroundColor: `${app.status_color}15`, color: app.status_color }}
                      >
                        {getStatusIcon(app.status_name)}
                        {app.status_name}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2 text-sm font-medium text-gray-500 bg-gray-50/50 p-3 rounded-xl">
                      {app.reason && (
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-tight text-gray-700">{app.reason}</span>
                        </div>
                      )}
                    </div>
                    
                    {app.status_name.toLowerCase() === 'cancelled' && app.cancellation_reason && (
                      <div className="mt-3 bg-red-50 text-red-600 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-start gap-2 border border-red-100">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Reason: {app.cancellation_reason}</span>
                      </div>
                    )}
                    
                    {app.status_name.toLowerCase() === 'completed' && app.notes && (
                      <div className="mt-3 bg-blue-50 text-blue-700 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-start gap-2 border border-blue-100">
                        <ClipboardList className="w-4 h-4 shrink-0" />
                        <span>Notes: {app.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {activeTab === 'upcoming' && app.status_name.toLowerCase() !== 'cancelled' && (
                    <div className="flex flex-row md:flex-col justify-end items-center md:items-end gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100 md:pl-4 shrink-0">
                      
                      {app.status_name.toLowerCase() === 'pending' && (
                        <Button 
                          onClick={() => handleStatusChange(app.id, 2, 'confirmed')} // 2 = Confirmed
                          className="w-full md:w-full bg-[#10b981] hover:bg-[#059669] text-white shadow-sm shadow-[#10b981]/20 font-bold rounded-xl h-10 text-xs transition-all"
                          disabled={isProcessing}
                        >
                          Confirm
                        </Button>
                      )}

                      {app.status_name.toLowerCase() === 'confirmed' && (
                        <Button 
                          onClick={() => openCompleteModal(app.id)}
                          className="w-full md:w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 font-bold rounded-xl h-10 text-xs transition-all"
                          disabled={isProcessing}
                        >
                          Mark Complete
                        </Button>
                      )}

                      <Button 
                        variant="ghost" 
                        onClick={() => handleCancelClick(app.id)}
                        disabled={isProcessing}
                        className="w-full md:w-full text-red-600 hover:text-red-700 hover:bg-red-50 font-bold rounded-xl h-10 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  
                  {activeTab === 'history' && (
                    <div className="flex flex-row md:flex-col justify-end items-center md:items-end gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100 md:pl-4">
                      <Link href={`/doctor/patients/${app.patient_id}`}>
                        <Button variant="outline" className="w-full md:w-auto border-gray-200 text-gray-700 font-semibold rounded-xl h-10 text-xs hover:bg-gray-50">
                          View Patient Profile
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-3xl">
          <div className="p-8 pb-6">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900 mb-2 text-center">Cancel Appointment</DialogTitle>
            <DialogDescription className="text-sm font-medium text-gray-500 mb-6 text-center px-2">
              Are you sure you want to cancel this appointment? This action cannot be undone and the patient will be notified immediately.
            </DialogDescription>
            <div className="space-y-2 mb-2">
              <label className="text-sm font-bold text-gray-900 ml-1">Reason for cancellation (optional)</label>
              <textarea 
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="E.g., Emergency, Schedule conflict..."
                className="w-full h-24 p-4 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none bg-gray-50/50 hover:bg-gray-50 focus:bg-white"
              />
            </div>
          </div>
          <DialogFooter className="bg-gray-50/80 pt-5 pb-6 px-8 border-t border-gray-100 flex gap-3 justify-end rounded-b-3xl">
            <Button variant="ghost" className="font-bold text-gray-600 hover:bg-gray-200 rounded-xl" onClick={() => setCancelModalOpen(false)}>Back</Button>
            <Button className="bg-red-500 hover:bg-red-600 text-white font-bold shadow-md shadow-red-500/20 rounded-xl px-6" onClick={submitCancel} disabled={isProcessing}>
              {isProcessing ? 'Cancelling...' : 'Cancel Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Notes Modal */}
      <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-3xl">
          <div className="p-8 pb-6">
            <div className="w-16 h-16 bg-[#10b981]/10 text-[#10b981] rounded-full flex items-center justify-center mb-6 mx-auto">
              <ClipboardList className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900 mb-2 text-center">Complete Appointment</DialogTitle>
            <DialogDescription className="text-sm font-medium text-gray-500 mb-6 text-center px-4">
              Mark this consultation as completed. You can add brief clinical notes below which will be saved securely with the appointment record.
            </DialogDescription>
            <div className="space-y-2 mb-2">
              <label className="text-sm font-bold text-gray-900 ml-1">Clinical Notes (Optional)</label>
              <textarea 
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="E.g., Patient reported feeling better. Prescribed antibiotics for 5 days. Suggested follow-up in 2 weeks."
                className="w-full h-32 p-4 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all resize-none bg-gray-50/50 hover:bg-gray-50 focus:bg-white leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter className="bg-gray-50/80 pt-5 pb-6 px-8 border-t border-gray-100 flex gap-3 justify-end rounded-b-3xl">
            <Button variant="ghost" className="font-bold text-gray-600 hover:bg-gray-200 rounded-xl" onClick={() => setNotesModalOpen(false)}>Cancel</Button>
            <Button className="bg-[#10b981] hover:bg-[#059669] text-white font-bold shadow-md shadow-[#10b981]/20 rounded-xl px-6" onClick={submitComplete} disabled={isProcessing}>
              {isProcessing ? 'Saving...' : 'Mark as Completed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
