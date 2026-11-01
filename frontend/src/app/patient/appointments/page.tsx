"use client";

import { useEffect, useState } from "react";
import { useAppointmentStore } from "@/store/useAppointmentStore";
import { 
  Calendar as CalendarIcon, Clock, MapPin, Search, Filter, 
  ChevronRight, MoreVertical, AlertCircle, CheckCircle2, 
  XCircle, Video, FileText, ArrowRight, X, Building2, Star, StarHalf
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { format, isFuture, isPast, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function PatientAppointments() {
  const { appointments, isLoading, fetchAppointments, cancelAppointment } = useAppointmentStore();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReviewApp, setSelectedReviewApp] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReportApp, setSelectedReportApp] = useState<any>(null);

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
    .filter(a => parseISO(`${a.appointment_date.split('T')[0]}T${a.start_time}`) > now)
    .filter(a => !['completed', 'cancelled'].includes(a.status_name.toLowerCase()))
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

  const historyAppointments = appointments
    .filter(a => ['completed', 'cancelled'].includes(a.status_name.toLowerCase()) || 
                 (parseISO(`${a.appointment_date.split('T')[0]}T${a.start_time}`) <= now))
    .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());

  const displayedAppointments = activeTab === 'upcoming' ? upcomingAppointments : historyAppointments;

  const filteredAppointments = displayedAppointments.filter(app => {
    const docName = `${app.doctor_first_name} ${app.doctor_last_name}`.toLowerCase();
    const hospName = (app.hospital_name || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return docName.includes(q) || hospName.includes(q) || app.consultation_type.toLowerCase().includes(q);
  });

  const getStatusIcon = (status: string) => {
    switch(status.toLowerCase()) {
      case 'confirmed': return <CheckCircle2 className="w-3.5 h-3.5 mr-1" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5 mr-1" />;
      case 'pending': return <Clock className="w-3.5 h-3.5 mr-1" />;
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
    setIsCancelling(true);
    try {
      await cancelAppointment(selectedAppointmentId, cancelReason || "Cancelled by patient");
      setCancelModalOpen(false);
    } catch (error) {
      console.error("Failed to cancel", error);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full pb-10">
      
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">My Appointments</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage your upcoming visits and view consultation history.</p>
        </div>
        
        <Link href="/discover">
          <Button className="bg-[#10b981] hover:bg-[#059669] text-white shadow-lg shadow-emerald-500/25 rounded-xl h-11 px-6 font-semibold transition-all hover:scale-105 active:scale-95">
            Book New Appointment
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Upcoming', value: upcomingAppointments.length, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Pending', value: appointments.filter(a => a.status_name === 'Pending').length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Completed', value: appointments.filter(a => a.status_name === 'Completed').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Cancelled', value: appointments.filter(a => a.status_name === 'Cancelled').length, color: 'text-red-600', bg: 'bg-red-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center font-bold text-xl`}>
              {isLoading ? <Skeleton className="w-6 h-6 rounded-full" /> : stat.value}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <Card className="bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/50 p-2 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <div className="flex bg-white rounded-xl shadow-sm p-1 border border-gray-100 w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 sm:flex-none px-6 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'upcoming' ? 'bg-[#10b981] text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Upcoming ({upcomingAppointments.length})
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-none px-6 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'history' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
            >
              History
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search doctor or hospital..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all"
            />
          </div>
        </div>

        <CardContent className="p-6 sm:p-8">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <CalendarIcon className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No {activeTab} appointments</h3>
              <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto mb-6">
                {searchQuery ? "We couldn't find any appointments matching your search." : "You don't have any appointments in this category right now."}
              </p>
              {!searchQuery && activeTab === 'upcoming' && (
                <Link href="/discover">
                  <Button variant="outline" className="border-gray-200 text-gray-700 font-semibold rounded-xl h-10">
                    Find a Doctor
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAppointments.map((app) => (
                <div key={app.id} className={`flex flex-col md:flex-row gap-6 p-5 sm:p-6 rounded-2xl border transition-all hover:shadow-md ${app.status_name.toLowerCase() === 'cancelled' ? 'bg-gray-50/50 border-gray-100' : 'bg-white border-gray-200'}`}>
                  
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
                    <div className="md:mt-4 flex items-center gap-1.5 bg-gray-100/80 px-2.5 py-1 rounded-md text-xs font-bold text-gray-600">
                      <Clock className="w-3 h-3" />
                      {app.start_time.substring(0, 5)}
                    </div>
                  </div>

                  {/* Middle: Info */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 rounded-xl border border-gray-100 shadow-sm">
                          <AvatarImage src={app.doctor_avatar || undefined} />
                          <AvatarFallback className="bg-[#10b981]/10 text-[#10b981] font-bold text-lg rounded-xl">
                            {app.doctor_first_name.charAt(0)}{app.doctor_last_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className={`text-base font-bold ${app.status_name.toLowerCase() === 'cancelled' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            Dr. {app.doctor_first_name} {app.doctor_last_name}
                          </h3>
                          <p className="text-sm font-medium text-[#10b981]">
                            {app.consultation_type === 'online' ? 'Online Consultation' : 'In-Person Visit'}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`font-semibold px-2.5 py-0.5 border-0 shadow-sm flex items-center gap-1 capitalize`}
                        style={{ backgroundColor: `${app.status_color}15`, color: app.status_color }}
                      >
                        {getStatusIcon(app.status_name)}
                        {app.status_name}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm font-medium text-gray-500">
                      {app.hospital_name && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          {app.hospital_name}
                        </div>
                      )}
                      {app.reason && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-gray-400" />
                          {app.reason}
                        </div>
                      )}
                    </div>
                    
                    {app.status_name.toLowerCase() === 'cancelled' && app.cancellation_reason && (
                      <div className="mt-3 bg-red-50 text-red-600 text-xs font-medium px-3 py-2 rounded-lg flex items-start gap-2 border border-red-100">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Reason: {app.cancellation_reason}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {activeTab === 'upcoming' && app.status_name.toLowerCase() !== 'cancelled' && (
                    <div className="flex flex-row md:flex-col justify-end items-center md:items-end gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100 md:pl-4">
                      {app.consultation_type === 'online' && (
                        <Button className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm font-semibold rounded-xl h-9 text-xs">
                          <Video className="w-4 h-4 mr-1.5" />
                          Join Call
                        </Button>
                      )}
                      {/* <Button variant="outline" className="w-full md:w-auto border-gray-200 text-gray-700 font-semibold rounded-xl h-9 text-xs">
                        Reschedule
                      </Button> */}
                      <Button 
                        variant="ghost" 
                        onClick={() => handleCancelClick(app.id)}
                        className="w-full md:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold rounded-xl h-9 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  
                  {activeTab === 'history' && app.status_name.toLowerCase() === 'completed' && (
                    <div className="flex flex-row md:flex-col justify-end items-center md:items-end gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100 md:pl-4">
                      <Button 
                        variant="outline" 
                        onClick={() => { setSelectedReportApp(app); setReportModalOpen(true); }}
                        className="w-full md:w-auto border-gray-200 text-[#10b981] font-semibold rounded-xl h-9 text-xs bg-[#10b981]/5 hover:bg-[#10b981]/10 border-transparent"
                      >
                        View Report
                      </Button>
                      {!app.is_reviewed && (
                        <Button variant="ghost" className="w-full md:w-auto text-amber-500 hover:text-amber-600 hover:bg-amber-50 font-semibold rounded-xl h-9 text-xs" onClick={() => { setSelectedReviewApp(app); setReviewModalOpen(true); }}>
                          <Star className="w-4 h-4 mr-1.5" /> Rate Doctor
                        </Button>
                      )}
                      <Link href="/discover">
                        <Button variant="ghost" className="w-full md:w-auto text-gray-500 hover:text-gray-900 font-semibold rounded-xl h-9 text-xs">
                          Book Again
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
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
          <div className="p-6">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 mb-2">Cancel Appointment?</DialogTitle>
            <DialogDescription className="text-gray-500 mb-4 font-medium">
              Are you sure you want to cancel this appointment? This action cannot be undone and you may need to book a new slot if you change your mind.
            </DialogDescription>
            
            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Reason for cancellation (optional)</label>
              <textarea 
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="E.g., Unexpected schedule conflict..."
                className="w-full h-24 p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setCancelModalOpen(false)}
                className="border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
              >
                Keep Appointment
              </Button>
              <Button 
                variant="destructive" 
                onClick={submitCancel}
                disabled={isCancelling}
                className="bg-red-600 hover:bg-red-700 font-semibold rounded-xl shadow-lg shadow-red-600/20"
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Rate your consultation</h3>
            <p className="text-sm text-gray-500 mb-6">How was your experience with Dr. {selectedReviewApp?.doctor_first_name} {selectedReviewApp?.doctor_last_name}?</p>
            <div className="flex items-center justify-center gap-2 mb-6" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map(star => {
                const currentRating = hoverRating || rating;
                const isFull = currentRating >= star;
                const isHalf = currentRating >= star - 0.5 && currentRating < star;
                
                return (
                  <div key={star} className="relative w-10 h-10 cursor-pointer transition-transform hover:scale-110">
                    <Star className="absolute top-0 left-0 w-10 h-10 text-gray-200" />
                    
                    {isFull && <Star className="absolute top-0 left-0 w-10 h-10 text-amber-400 fill-amber-400" />}
                    {isHalf && <StarHalf className="absolute top-0 left-0 w-10 h-10 text-amber-400 fill-amber-400" />}
                    
                    <div 
                      className="absolute top-0 left-0 w-1/2 h-full z-10" 
                      onMouseEnter={() => setHoverRating(star - 0.5)}
                      onClick={() => setRating(star - 0.5)}
                    />
                    <div 
                      className="absolute top-0 right-0 w-1/2 h-full z-10" 
                      onMouseEnter={() => setHoverRating(star)}
                      onClick={() => setRating(star)}
                    />
                  </div>
                );
              })}
            </div>
            <textarea
              placeholder="Leave a comment (optional)..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] resize-none min-h-[100px] mb-2 text-sm"
            />
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setReviewModalOpen(false); setRating(0); setReviewComment(""); }} className="rounded-xl font-semibold text-gray-600">Cancel</Button>
            <Button 
              className="bg-[#10b981] hover:bg-[#059669] text-white rounded-xl shadow-md font-bold px-6"
              disabled={rating === 0 || isSubmittingReview}
              onClick={async () => {
                setIsSubmittingReview(true);
                try {
                  await api.post("/reviews", {
                    doctorId: selectedReviewApp.doctor_id,
                    appointmentId: selectedReviewApp.id,
                    rating,
                    comment: reviewComment
                  });
                  toast.success("Thank you for your feedback!");
                  setReviewModalOpen(false);
                  setRating(0);
                  setReviewComment("");
                  fetchAppointments(); // Refresh to hide Rate button
                } catch(e: any) {
                  toast.error(e.response?.data?.message || e.message || "Failed to submit review");
                } finally { setIsSubmittingReview(false); }
              }}
            >
              {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Report Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-3xl">
          <div className="p-8 pb-6">
            <div className="w-16 h-16 bg-[#10b981]/10 text-[#10b981] rounded-full flex items-center justify-center mb-6 mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900 mb-2 text-center">Consultation Report</DialogTitle>
            <DialogDescription className="text-sm font-medium text-gray-500 mb-6 text-center px-4">
              Clinical notes and report provided by Dr. {selectedReportApp?.doctor_first_name} {selectedReportApp?.doctor_last_name}.
            </DialogDescription>
            <div className="space-y-4 mb-2">
              <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Doctor's Notes</h4>
                <p className="text-sm text-gray-700 leading-relaxed font-medium">
                  {selectedReportApp?.notes || "No clinical notes were provided for this consultation."}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="bg-gray-50/80 pt-5 pb-6 px-8 border-t border-gray-100 flex gap-3 justify-end rounded-b-3xl">
            <Button className="bg-[#10b981] hover:bg-[#059669] text-white font-bold shadow-md shadow-[#10b981]/20 rounded-xl px-6" onClick={() => setReportModalOpen(false)}>
              Close Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
