"use client";

import React, { useState, useEffect } from "react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subDays, addHours, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar as CalendarIcon, Clock, User, MoreVertical, CheckCircle2, 
  XCircle, AlertCircle, MapPin, Activity, FileText, ChevronLeft, 
  ChevronRight, Phone, Video, Users, Sun, Moon, Plus
} from "lucide-react";
import { toast } from "sonner";
import { useAppointmentStore } from "@/store/useAppointmentStore";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

export default function SchedulePage() {
  const { user } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("daily");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isEmergencyEnabled, setIsEmergencyEnabled] = useState(false);
  const [isBlockTimeSlotOpen, setIsBlockTimeSlotOpen] = useState(false);
  const [isAddWalkInOpen, setIsAddWalkInOpen] = useState(false);
  const [newBlockedSlot, setNewBlockedSlot] = useState({ date: format(new Date(), 'yyyy-MM-dd'), startTime: "12:00", endTime: "13:00", reason: "Lunch Break" });
  const [newWalkIn, setNewWalkIn] = useState({ patientId: "", appointmentDate: format(new Date(), 'yyyy-MM-dd'), startTime: "10:00", endTime: "10:30", type: "Walk-in" });
  const [slots, setSlots] = useState<any[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [myPatients, setMyPatients] = useState<any[]>([]);
  const [newLeave, setNewLeave] = useState({ startDate: "", endDate: "", reason: "" });
  const [workingHours, setWorkingHours] = useState([
    { dayOfWeek: 1, active: true, startTime: "09:00", endTime: "17:00", slotDuration: 30, maxBookings: 1 },
    { dayOfWeek: 2, active: true, startTime: "09:00", endTime: "17:00", slotDuration: 30, maxBookings: 1 },
    { dayOfWeek: 3, active: true, startTime: "09:00", endTime: "17:00", slotDuration: 30, maxBookings: 1 },
    { dayOfWeek: 4, active: true, startTime: "09:00", endTime: "17:00", slotDuration: 30, maxBookings: 1 },
    { dayOfWeek: 5, active: true, startTime: "09:00", endTime: "17:00", slotDuration: 30, maxBookings: 1 },
    { dayOfWeek: 6, active: false, startTime: "09:00", endTime: "13:00", slotDuration: 30, maxBookings: 1 },
    { dayOfWeek: 0, active: false, startTime: "09:00", endTime: "13:00", slotDuration: 30, maxBookings: 1 },
  ]);
  const { fetchAppointments, appointments: realAppointments } = useAppointmentStore();

  useEffect(() => {
    fetchAppointments(1, 100);
    fetchSlots();
    const intervalId = setInterval(() => {
      fetchAppointments(1, 100, '', true);
    }, 10000);
    return () => clearInterval(intervalId);
  }, [fetchAppointments]);

  const fetchSlots = async () => {
    try {
      const res: any = await api.get('/doctors/my-profile/slots');
      setSlots(res.data || []);
      const leaveRes: any = await api.get('/doctors/my-leaves');
      setLeaves(leaveRes.data || []);
      const blockRes: any = await api.get('/doctors/my-blocked-slots');
      setBlockedSlots(blockRes.data || []);
      const patientsRes: any = await api.get('/doctors/my-patients?limit=100');
      if (patientsRes.data) {
        setMyPatients(patientsRes.data);
      }
    } catch (error) {
      console.error("Failed to fetch schedule data:", error);
    }
  };

  useEffect(() => {
    if (slots.length > 0) {
      setWorkingHours(prev => prev.map(h => {
        const slot = slots.find(s => s.day_of_week === h.dayOfWeek);
        if (slot) {
          return {
            ...h,
            active: true,
            startTime: slot.start_time.substring(0, 5),
            endTime: slot.end_time.substring(0, 5),
            slotDuration: slot.slot_duration || 30
          };
        }
        return { ...h, active: false };
      }));
    }
  }, [slots]);

  useEffect(() => {
    // Map real appointments to the mock structure the UI expects
    const mapped = realAppointments.map(a => {
      const [year, month, day] = a.appointment_date.split('T')[0].split('-');
      const aptDate = new Date(Number(year), Number(month) - 1, Number(day));
      // Construct time string like "09:00 AM"
      let hour = parseInt(a.start_time.split(':')[0]);
      const min = a.start_time.split(':')[1];
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      if (hour === 0) hour = 12;
      const timeStr = `${hour.toString().padStart(2, '0')}:${min} ${ampm}`;
      
      return {
        id: a.id.toString(),
        patientName: `${a.patient_first_name} ${a.patient_last_name}`,
        age: 30, // Mock age since DB patient table doesn't return age here
        reason: a.reason || 'General Consultation',
        type: a.consultation_type === 'emergency' ? 'Emergency' : 'Routine',
        date: aptDate,
        time: timeStr,
        status: a.status_name,
        historyPreview: a.notes || 'No recent history'
      };
    });
    setAppointments(mapped);
  }, [realAppointments]);

  // Computed Data
  const todayAppointments = appointments.filter(a => isSameDay(a.date, currentDate));
  
  const calculateAvailableHours = () => {
    // Check if on leave
    const isLeave = leaves.some(l => l.status === 'approved' && currentDate >= new Date(l.start_date) && currentDate <= new Date(l.end_date));
    if (isLeave) return 0;

    const dayOfWeek = currentDate.getDay();
    const wh = workingHours.find(w => w.dayOfWeek === dayOfWeek);
    if (!wh || !wh.active) return 0;

    const [startH, startM] = wh.startTime.split(':').map(Number);
    const [endH, endM] = wh.endTime.split(':').map(Number);
    let totalHrs = (endH + endM / 60) - (startH + startM / 60);

    // Subtract blocked slots for this day
    const dayBlocks = blockedSlots.filter(b => {
      const [year, month, day] = b.block_date.split('T')[0].split('-');
      const blockDate = new Date(Number(year), Number(month) - 1, Number(day));
      return isSameDay(blockDate, currentDate);
    });
    
    dayBlocks.forEach(b => {
      const [bsH, bsM] = b.start_time.split(':').map(Number);
      const [beH, beM] = b.end_time.split(':').map(Number);
      const blockDuration = (beH + beM / 60) - (bsH + bsM / 60);
      totalHrs -= blockDuration;
    });

    return Math.max(0, parseFloat(totalHrs.toFixed(1)));
  };
  
  const availableHrs = calculateAvailableHours();
  // Navigation
  const nextDay = () => setCurrentDate(addDays(currentDate, 1));
  const prevDay = () => setCurrentDate(subDays(currentDate, 1));
  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const prevWeek = () => setCurrentDate(subDays(currentDate, 7));
  const nextMonth = () => setCurrentDate(addDays(currentDate, 30));
  const prevMonth = () => setCurrentDate(subDays(currentDate, 30));

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const statusMap: Record<string, number> = { 'Pending': 1, 'Confirmed': 2, 'Completed': 4, 'Cancelled': 5 };
      const statusId = statusMap[newStatus];
      if (!statusId) return;
      await api.put(`/appointments/${id}`, { statusId });
      toast.success(`Appointment status updated to ${newStatus}`);
      fetchAppointments(1, 100, '', true); // Refresh silently
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case "confirmed": return "bg-green-100 text-green-700 border-green-200";
      case "pending": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "completed": return "bg-blue-100 text-blue-700 border-blue-200";
      case "cancelled": return "bg-red-100 text-red-700 border-red-200";
      case "emergency": return "bg-red-500 text-white border-red-600";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case "Routine": return <Users className="w-4 h-4 mr-1" />;
      case "Emergency": return <AlertCircle className="w-4 h-4 mr-1 text-red-500" />;
      case "Follow-up": return <Activity className="w-4 h-4 mr-1" />;
      default: return <User className="w-4 h-4 mr-1" />;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-8">
      
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Schedule</h1>
          <p className="text-slate-500 mt-1">Manage your appointments, availability, and leaves.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant={isEmergencyEnabled ? "destructive" : "secondary"} className="px-3 py-1.5 cursor-pointer text-sm font-medium" onClick={() => setIsEmergencyEnabled(!isEmergencyEnabled)}>
            {isEmergencyEnabled ? "🚨 Emergency Consults: ON" : "Emergency Consults: OFF"}
          </Badge>
          <Dialog open={isAddWalkInOpen} onOpenChange={setIsAddWalkInOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Walk-in Patient</DialogTitle>
                <DialogDescription>
                  Quickly book a consultation for a patient currently at the clinic.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Patient</Label>
                  <Select value={newWalkIn.patientId} onValueChange={(v) => setNewWalkIn({...newWalkIn, patientId: v})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {myPatients.length > 0 ? myPatients.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.first_name} {p.last_name} ({p.email})
                        </SelectItem>
                      )) : (
                        <div className="p-2 text-sm text-slate-500 text-center">No patients found.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Date</Label>
                  <Input type="date" value={newWalkIn.appointmentDate} onChange={(e) => setNewWalkIn({...newWalkIn, appointmentDate: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Start Time</Label>
                  <Input type="time" value={newWalkIn.startTime} onChange={(e) => setNewWalkIn({...newWalkIn, startTime: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">End Time</Label>
                  <Input type="time" value={newWalkIn.endTime} onChange={(e) => setNewWalkIn({...newWalkIn, endTime: e.target.value})} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddWalkInOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  try {
                    if(!newWalkIn.patientId) return toast.error("Patient ID is required");
                    await api.post('/appointments', {
                      patientId: parseInt(newWalkIn.patientId),
                      doctorId: user?.doctor?.id || 0,
                      appointmentDate: newWalkIn.appointmentDate,
                      startTime: newWalkIn.startTime,
                      endTime: newWalkIn.endTime,
                      consultationType: "in_person",
                      reason: "Walk-in Consultation"
                    });
                    toast.success("Walk-in appointment created");
                    setIsAddWalkInOpen(false);
                    fetchAppointments(1, 100, '', true);
                  } catch(e: any) {
                    toast.error(e.response?.data?.message || e.message || "Failed to create appointment");
                  }
                }}>Book Walk-in</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isBlockTimeSlotOpen} onOpenChange={setIsBlockTimeSlotOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Block Time Slot</DialogTitle>
                <DialogDescription>
                  Temporarily block your calendar for meetings, lunch, or other unavailability.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Date</Label>
                  <Input type="date" value={newBlockedSlot.date} onChange={(e) => setNewBlockedSlot({...newBlockedSlot, date: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Start Time</Label>
                  <Input type="time" value={newBlockedSlot.startTime} onChange={(e) => setNewBlockedSlot({...newBlockedSlot, startTime: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">End Time</Label>
                  <Input type="time" value={newBlockedSlot.endTime} onChange={(e) => setNewBlockedSlot({...newBlockedSlot, endTime: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Reason</Label>
                  <Input placeholder="e.g. Lunch Break" value={newBlockedSlot.reason} onChange={(e) => setNewBlockedSlot({...newBlockedSlot, reason: e.target.value})} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBlockTimeSlotOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  try {
                    await api.post('/doctors/blocked-slots', newBlockedSlot);
                    toast.success("Time slot blocked successfully");
                    setIsBlockTimeSlotOpen(false);
                    fetchSlots();
                  } catch(e: any) {
                    toast.error(e.message || "Failed to block slot");
                  }
                }}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{isSameDay(currentDate, new Date()) ? "Today's Total" : format(currentDate, 'MMM d') + " Total"}</p>
              <h3 className="text-2xl font-bold text-slate-900">{todayAppointments.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50 border-green-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full text-green-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Completed</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {todayAppointments.filter(a => a.status?.toLowerCase() === 'completed').length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50/50 border-yellow-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-full text-yellow-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {todayAppointments.filter(a => a.status?.toLowerCase() === 'pending').length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 border-red-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full text-red-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Emergencies</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {todayAppointments.filter(a => a.type?.toLowerCase() === 'emergency').length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50/50 border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-slate-200 rounded-full text-slate-600">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Available Hrs</p>
              <h3 className="text-2xl font-bold text-slate-900">{availableHrs}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
        <div className="flex justify-between items-center border-b pb-2 mb-6">
          <TabsList className="bg-slate-100/80 p-1">
            <TabsTrigger value="daily" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4">Daily View</TabsTrigger>
            <TabsTrigger value="weekly" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4">Weekly Calendar</TabsTrigger>
            <TabsTrigger value="monthly" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4">Monthly View</TabsTrigger>
            <TabsTrigger value="availability" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4">Availability & Leave</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={
              activeTab === 'daily' ? prevDay : activeTab === 'weekly' ? prevWeek : prevMonth
            }>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-sm font-semibold w-40 text-center text-slate-700">
              {activeTab === 'daily' && format(currentDate, 'MMMM dd, yyyy')}
              {activeTab === 'weekly' && `Week of ${format(startOfWeek(currentDate), 'MMM dd')}`}
              {activeTab === 'monthly' && format(currentDate, 'MMMM yyyy')}
              {activeTab === 'availability' && "Manage Setup"}
            </h3>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={
              activeTab === 'daily' ? nextDay : activeTab === 'weekly' ? nextWeek : nextMonth
            }>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="sm" className="ml-2" onClick={() => setCurrentDate(new Date())}>Today</Button>
          </div>
        </div>

        {/* DAILY VIEW */}
        <TabsContent value="daily" className="mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Timeline Area */}
            <Card className="lg:col-span-3 border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4">
                <CardTitle className="text-lg flex items-center font-semibold text-slate-800">
                  <Clock className="w-5 h-5 mr-2 text-indigo-500" />
                  Appointment Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="relative p-6 px-8">
                    {/* Vertical Timeline Line */}
                    <div className="absolute left-32 top-6 bottom-6 w-px bg-slate-200"></div>

                    {todayAppointments.length === 0 ? (
                      <div className="text-center py-20 text-slate-500 flex flex-col items-center">
                        <CalendarIcon className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-lg font-medium text-slate-600">No appointments scheduled</p>
                        <p className="text-sm">You have a clear schedule for this day.</p>
                      </div>
                    ) : (
                      todayAppointments.sort((a,b) => a.time.localeCompare(b.time)).map((apt, index) => (
                        <div key={apt.id} className="relative flex items-start gap-8 mb-8 group">
                          {/* Time */}
                          <div className="w-20 flex-shrink-0 text-right pt-4">
                            <span className="text-lg font-bold text-slate-700 block">{apt.time.split(' ')[0]}</span>
                            <span className="text-xs font-semibold text-slate-400 block -mt-1">{apt.time.split(' ')[1]}</span>
                          </div>
                          
                          {/* Timeline Node */}
                          <div className={`absolute left-24 -translate-x-1/2 mt-5 w-4 h-4 rounded-full border-4 border-white ring-2 z-10 shadow-sm ${apt.status?.toLowerCase() === 'completed' ? 'bg-green-500 ring-green-100' : apt.type?.toLowerCase() === 'emergency' ? 'bg-red-500 ring-red-100' : 'bg-indigo-500 ring-indigo-100'}`}></div>
                          
                          {/* Card */}
                          <div className={`flex-1 border rounded-xl p-5 shadow-sm transition-all hover:shadow-md cursor-default ${apt.type?.toLowerCase() === 'emergency' ? 'border-red-200 bg-red-50/20' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-lg font-bold text-slate-900 tracking-tight">{apt.patientName}</h4>
                                  <Badge variant="outline" className={`${getStatusColor(apt.status)} border rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize`}>
                                    {apt.status}
                                  </Badge>
                                  {apt.type?.toLowerCase() === "emergency" && (
                                    <Badge variant="destructive" className="animate-pulse shadow-sm rounded-full px-2.5 py-0.5 text-xs">Emergency</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-5 text-sm text-slate-600 mt-3 font-medium">
                                  <span className="flex items-center bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">{getTypeIcon(apt.type)} {apt.type}</span>
                                  <span className="flex items-center"><User className="w-4 h-4 mr-1.5 text-slate-400"/> {apt.age} yrs</span>
                                  <span className="flex items-center text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md"><FileText className="w-4 h-4 mr-1.5 text-indigo-500"/> {apt.reason}</span>
                                </div>
                              </div>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus:outline-none">
                                  <MoreVertical className="w-5 h-5" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 shadow-lg rounded-xl border-slate-200">
                                  <DropdownMenuLabel className="font-semibold text-slate-700">Quick Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {apt.status?.toLowerCase() === 'pending' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(apt.id, 'Confirmed')} className="cursor-pointer font-medium">
                                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Accept Appointment
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleStatusChange(apt.id, 'Completed')} className="cursor-pointer font-medium">
                                    <CheckCircle2 className="w-4 h-4 mr-2 text-blue-600" /> Mark as Completed
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="cursor-pointer font-medium">
                                    <Clock className="w-4 h-4 mr-2 text-orange-500" /> Reschedule
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleStatusChange(apt.id, 'Cancelled')} className="text-red-600 cursor-pointer font-medium focus:bg-red-50 focus:text-red-700">
                                    <XCircle className="w-4 h-4 mr-2" /> Cancel Appointment
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            {/* Patient Preview Section */}
                            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
                              <div className="flex-1">
                                <p className="text-sm text-slate-600 flex items-center">
                                  <Activity className="w-4 h-4 mr-2 text-indigo-500" />
                                  <span className="font-semibold text-slate-700 mr-2">Quick History:</span> {apt.historyPreview}
                                </p>
                              </div>
                              
                              <Dialog>
                                <DialogTrigger render={<Button variant="secondary" size="sm" className="font-semibold shadow-sm ml-4" />}>
                                  View Patient
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
                                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl font-bold border border-white/30 shadow-inner">
                                          {apt.patientName.charAt(0)}
                                        </div>
                                        <div>
                                          <h3 className="text-2xl font-bold tracking-tight">{apt.patientName}</h3>
                                          <p className="text-indigo-100 font-medium">{apt.age} years old • Patient</p>
                                        </div>
                                      </div>
                                      <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0 shadow-sm backdrop-blur-md">
                                        {apt.status}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="p-6 space-y-6 bg-white">
                                    <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date & Time</p>
                                        <p className="font-semibold text-slate-800">{format(apt.date, 'MMM dd, yyyy')} at {apt.time}</p>
                                      </div>
                                      <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consultation Type</p>
                                        <p className="font-semibold text-slate-800 flex items-center">{getTypeIcon(apt.type)} {apt.type}</p>
                                      </div>
                                      <div className="col-span-2 space-y-1.5 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Chief Complaint</p>
                                        <p className="font-semibold text-indigo-900">{apt.reason}</p>
                                      </div>
                                      <div className="col-span-2 space-y-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Medical History Summary</p>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed font-medium shadow-sm">
                                          {apt.historyPreview}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                                    {apt.status?.toLowerCase() === 'pending' && <Button variant="outline" className="font-semibold border-slate-300" onClick={() => handleStatusChange(apt.id, 'Confirmed')}>Accept</Button>}
                                    <Button className="font-semibold shadow-sm bg-indigo-600 hover:bg-indigo-700" onClick={() => handleStatusChange(apt.id, 'Completed')}>Start Consultation</Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Sidebar Tools */}
            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="pb-3 bg-slate-50 border-b">
                  <CardTitle className="text-md font-semibold text-slate-800 flex items-center"><Plus className="w-4 h-4 mr-2 text-indigo-500" /> Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <Button 
                    className="w-full justify-start font-medium shadow-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200" 
                    variant="outline"
                    onClick={() => setIsAddWalkInOpen(true)}
                  >
                    <User className="w-4 h-4 mr-2" /> Add Walk-in Patient
                  </Button>
                  <Button 
                    className="w-full justify-start font-medium shadow-sm text-slate-700 border-slate-200 hover:bg-slate-50" 
                    variant="outline"
                    onClick={() => setIsBlockTimeSlotOpen(true)}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" /> Block Time Slot
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b bg-slate-50">
                  <CardTitle className="text-md font-semibold text-slate-800 flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-indigo-500" /> Up Next
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {todayAppointments.filter(a => a.status === 'Pending' || a.status === 'Confirmed').length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {todayAppointments.filter(a => a.status === 'Pending' || a.status === 'Confirmed').slice(0, 4).map(a => (
                        <div key={a.id} className="flex gap-4 items-center p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                          <div className="text-center bg-indigo-50 text-indigo-700 rounded-lg p-2 w-16 flex-shrink-0 border border-indigo-100 shadow-sm">
                            <div className="text-sm font-bold">{a.time.split(' ')[0]}</div>
                            <div className="text-[10px] font-semibold uppercase">{a.time.split(' ')[1]}</div>
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-800 truncate">{a.patientName}</p>
                            <p className="text-xs font-medium text-slate-500 flex items-center mt-1">
                              {a.type === 'Emergency' ? <AlertCircle className="w-3 h-3 text-red-500 mr-1"/> : <Activity className="w-3 h-3 text-slate-400 mr-1"/>}
                              {a.type}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 text-center py-8 font-medium">No upcoming appointments.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* WEEKLY VIEW */}
        <TabsContent value="weekly" className="mt-0 focus-visible:outline-none">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <CardTitle className="text-xl text-slate-800">Weekly Schedule</CardTitle>
              <CardDescription className="font-medium text-slate-500">Overview of all appointments and slots for the week.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-7 border border-slate-200 rounded-xl overflow-hidden text-sm shadow-sm">
                {/* Headers */}
                {eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) }).map((day, i) => {
                  const isLeave = leaves.some(l => l.status === 'approved' && day >= new Date(l.start_date) && day <= new Date(l.end_date));
                  return (
                  <div key={i} className={`p-4 text-center border-b border-r last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-indigo-50 border-b-indigo-200' : isLeave ? 'bg-red-50/50' : 'bg-slate-50'}`}>
                    <div className={`text-xs font-bold uppercase tracking-wider ${isSameDay(day, new Date()) ? 'text-indigo-600' : isLeave ? 'text-red-500' : 'text-slate-500'}`}>{format(day, 'EEE')}</div>
                    <div className={`text-2xl font-bold mt-1.5 ${isSameDay(day, new Date()) ? 'text-indigo-700' : 'text-slate-900'}`}>{format(day, 'dd')}</div>
                    {isLeave && <Badge variant="destructive" className="mt-2 text-[9px] px-1.5 py-0">On Leave</Badge>}
                  </div>
                )})}
                
                {/* Body Slots */}
                {Array.from({ length: 9 }).map((_, hourIdx) => (
                  <React.Fragment key={hourIdx}>
                    {eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) }).map((day, dayIdx) => {
                      const hour = 9 + hourIdx; // 9 AM to 5 PM
                      const isLunch = hour === 13;
                      const hasAppt = appointments.find(a => isSameDay(a.date, day) && parseInt(a.time) === (hour > 12 ? hour - 12 : hour));
                      const isLeave = leaves.some(l => l.status === 'approved' && day >= new Date(l.start_date) && day <= new Date(l.end_date));
                      const blockedSlot = blockedSlots.find(b => isSameDay(new Date(b.block_date), day) && parseInt(b.start_time.split(':')[0]) <= hour && parseInt(b.end_time.split(':')[0]) > hour);
                      
                      const isBlocked = isLunch || isLeave || blockedSlot;

                      return (
                        <div 
                          key={`${dayIdx}-${hourIdx}`} 
                          className={`h-28 border-b border-r last:border-r-0 p-1.5 relative ${isBlocked ? 'bg-slate-100/50' : 'bg-white'} hover:bg-slate-50 transition-colors ${!isBlocked && !hasAppt ? 'cursor-pointer' : ''} group`}
                          onClick={() => {
                            if (!hasAppt && !isBlocked) {
                              setNewWalkIn({
                                ...newWalkIn,
                                appointmentDate: format(day, 'yyyy-MM-dd'),
                                startTime: `${hour.toString().padStart(2, '0')}:00`,
                                endTime: `${(hour + 1).toString().padStart(2, '0')}:00`
                              });
                              setIsAddWalkInOpen(true);
                            }
                          }}
                        >
                          <span className="absolute top-1.5 left-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {hour > 12 ? `${hour-12} PM` : `${hour} AM`}
                          </span>
                          
                          {isBlocked && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold uppercase tracking-wider text-xs pointer-events-none text-center px-2">
                              {isLeave ? 'Leave' : blockedSlot ? blockedSlot.reason : isLunch ? 'Lunch Break' : 'Blocked'}
                            </div>
                          )}
                          
                          {hasAppt && !isBlocked && (
                            <div className={`mt-6 p-2 rounded-lg border text-xs shadow-sm transform transition-all group-hover:shadow-md group-hover:-translate-y-0.5 ${getStatusColor(hasAppt.status)}`}>
                              <div className="font-bold truncate tracking-tight">{hasAppt.patientName}</div>
                              <div className="text-[10px] font-medium opacity-80 truncate mt-0.5">{hasAppt.reason}</div>
                            </div>
                          )}
                          {!hasAppt && !isBlocked && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 m-auto w-fit h-fit text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                              + Add
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MONTHLY VIEW */}
        <TabsContent value="monthly" className="mt-0 focus-visible:outline-none">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <CardTitle className="text-xl text-slate-800">Monthly Planner</CardTitle>
              <CardDescription className="font-medium text-slate-500">High-level view of your workload and availability.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-7 border border-slate-200 rounded-xl overflow-hidden text-sm h-[700px] shadow-sm">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="p-4 text-center bg-slate-50 font-bold uppercase tracking-wider text-xs border-b border-r last:border-r-0 text-slate-500">
                    {d}
                  </div>
                ))}
                
                {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(currentDate)) }).map((day, i) => {
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const dayAppts = appointments.filter(a => isSameDay(a.date, day));
                  const isToday = isSameDay(day, new Date());
                  const isLeave = leaves.some(l => l.status === 'approved' && day >= new Date(l.start_date) && day <= new Date(l.end_date));
                  
                  return (
                    <div key={i} className={`p-3 border-b border-r last:border-r-0 flex flex-col gap-2 transition-colors hover:bg-slate-50 cursor-pointer ${!isCurrentMonth ? 'bg-slate-50/30 text-slate-400' : isLeave ? 'bg-red-50/50' : 'bg-white'}`}>
                      <div className={`font-bold text-sm ${isToday ? 'text-white bg-indigo-600 w-7 h-7 rounded-full flex items-center justify-center ml-auto shadow-md' : 'text-right text-slate-700'}`}>
                        {format(day, 'd')}
                      </div>
                      
                      {dayAppts.length > 0 && !isLeave && (
                        <div className="mt-auto space-y-1">
                          <Badge variant="secondary" className="w-full justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 py-1 font-bold shadow-sm">
                            {dayAppts.length} Appts
                          </Badge>
                          {dayAppts.filter(a => a.type === 'Emergency').length > 0 && (
                             <Badge variant="destructive" className="w-full justify-center py-1 font-bold shadow-sm text-[10px]">
                               {dayAppts.filter(a => a.type === 'Emergency').length} Urgent
                             </Badge>
                          )}
                        </div>
                      )}
                      {isLeave && (
                        <div className="mt-auto space-y-1">
                          <Badge variant="destructive" className="w-full justify-center py-1 font-bold shadow-sm">
                            On Leave
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AVAILABILITY & LEAVE */}
        <TabsContent value="availability" className="mt-0 space-y-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50 border-b pb-4">
                <CardTitle className="text-xl text-slate-800 flex items-center">
                  <CalendarIcon className="w-5 h-5 mr-2 text-indigo-500" />
                  Regular Working Hours
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">Define your standard availability slots.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {workingHours.map((wh, idx) => {
                  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  return (
                  <div key={wh.dayOfWeek} className="flex flex-col md:flex-row md:items-center justify-between border border-slate-100 p-4 rounded-xl bg-white shadow-sm gap-4">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={wh.active} onChange={(e) => {
                        const newHours = [...workingHours];
                        newHours[idx].active = e.target.checked;
                        setWorkingHours(newHours);
                      }} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                      <Label className="font-bold text-slate-700 w-24">{days[wh.dayOfWeek]}</Label>
                    </div>
                    {wh.active && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input type="time" value={wh.startTime} onChange={(e) => {
                          const newHours = [...workingHours];
                          newHours[idx].startTime = e.target.value;
                          setWorkingHours(newHours);
                        }} className="w-[110px] h-9 font-medium" />
                        <span className="text-slate-400 font-bold">-</span>
                        <Input type="time" value={wh.endTime} onChange={(e) => {
                          const newHours = [...workingHours];
                          newHours[idx].endTime = e.target.value;
                          setWorkingHours(newHours);
                        }} className="w-[110px] h-9 font-medium" />
                        <Select value={wh.slotDuration.toString()} onValueChange={(v) => {
                          const newHours = [...workingHours];
                          newHours[idx].slotDuration = parseInt(v);
                          setWorkingHours(newHours);
                        }}>
                          <SelectTrigger className="w-[100px] h-9 font-medium"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="20">20 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">60 min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )})}
                
                <Button className="w-full mt-2 font-semibold shadow-sm" size="lg" onClick={async () => {
                  try {
                    const activeSlots = workingHours.filter(h => h.active);
                    await api.post('/doctors/schedule', { schedule: activeSlots });
                    toast.success("Working hours saved successfully");
                    fetchSlots();
                  } catch (e: any) {
                    toast.error(e.message || "Failed to save working hours");
                  }
                }}>Save Schedule Settings</Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b pb-4">
                  <CardTitle className="text-xl text-slate-800 flex items-center">
                    <Sun className="w-5 h-5 mr-2 text-indigo-500" />
                    Mark Leave / Vacation
                  </CardTitle>
                  <CardDescription className="font-medium text-slate-500">Block your calendar for specified dates.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                      <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Start Date</Label>
                      <Input type="date" value={newLeave.startDate} onChange={(e) => setNewLeave({...newLeave, startDate: e.target.value})} className="font-medium" />
                    </div>
                    <div className="space-y-2.5">
                      <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">End Date</Label>
                      <Input type="date" value={newLeave.endDate} onChange={(e) => setNewLeave({...newLeave, endDate: e.target.value})} className="font-medium" />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Reason</Label>
                    <Input placeholder="E.g., Medical conference, personal leave" value={newLeave.reason} onChange={(e) => setNewLeave({...newLeave, reason: e.target.value})} className="font-medium" />
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full font-semibold border-slate-300" 
                    size="lg"
                    onClick={async () => {
                      try {
                        if (!newLeave.startDate || !newLeave.endDate || !newLeave.reason) return toast.error("Please fill all fields");
                        await api.post('/doctors/my-leaves', newLeave);
                        toast.success("Leave request submitted");
                        setNewLeave({ startDate: "", endDate: "", reason: "" });
                        fetchSlots();
                      } catch(e: any) {
                        toast.error(e.response?.data?.message || e.message || "Failed to submit leave");
                      }
                    }}
                  >
                    Submit Leave Request
                  </Button>
                  
                  {leaves.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-sm mb-3">Your Leave Requests</h4>
                      <div className="space-y-3">
                        {leaves.map((lv: any) => (
                          <div key={lv.id} className="p-3 border rounded-lg bg-slate-50 flex items-center justify-between text-sm">
                            <div>
                              <p className="font-semibold">{format(new Date(lv.start_date), 'MMM d, yyyy')} - {format(new Date(lv.end_date), 'MMM d, yyyy')}</p>
                              <p className="text-slate-500 text-xs mt-1">{lv.reason}</p>
                              {lv.admin_comment && <p className="text-red-500 text-xs mt-1 font-medium">Note: {lv.admin_comment}</p>}
                            </div>
                            <div>
                              {lv.status === 'pending' && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>}
                              {lv.status === 'approved' && <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>}
                              {lv.status === 'rejected' && <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50/50 shadow-sm">
                <CardHeader className="pb-3 border-b border-red-100">
                  <CardTitle className="text-red-700 flex items-center text-lg font-bold">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Emergency Handling
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Label className="text-slate-900 font-bold text-md">Enable Urgent Consultations</Label>
                      <p className="text-sm text-slate-600 mt-1 font-medium leading-snug">Allow the system to book emergency patients by overriding standard gaps or notifying you instantly.</p>
                    </div>
                    <Button 
                      variant={isEmergencyEnabled ? "default" : "outline"} 
                      className={`font-bold shadow-sm whitespace-nowrap ${isEmergencyEnabled ? "bg-red-600 hover:bg-red-700 text-white border-0" : "bg-white text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"}`}
                      onClick={() => setIsEmergencyEnabled(!isEmergencyEnabled)}
                    >
                      {isEmergencyEnabled ? "Status: Enabled" : "Status: Disabled"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
