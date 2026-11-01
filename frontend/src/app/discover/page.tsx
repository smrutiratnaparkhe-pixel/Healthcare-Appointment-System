"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Star, Building2, Loader2, Calendar, Heart, Phone, Users, Clock, ChevronRight, X, Navigation, Stethoscope, Filter, Zap, Mic, MicOff } from "lucide-react";
import api from "@/lib/api";
import { useSocketStore } from "@/store/useSocketStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";

const InteractiveMap = dynamic(() => import("@/components/map/InteractiveMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500/50" />
    </div>
  ),
});

// localStorage favorites helper
const getFavorites = (): number[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("favorite_hospitals") || "[]"); } catch { return []; }
};
const toggleFavorite = (id: number) => {
  const favs = getFavorites();
  const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
  localStorage.setItem("favorite_hospitals", JSON.stringify(next));
  return next;
};

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format, addDays, parseISO, isPast, isSameDay } from "date-fns";

export default function DiscoverPage() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [nearbyHospitals, setNearbyHospitals] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [activeHospitalId, setActiveHospitalId] = useState<number | null>(null);
  const [detailHospital, setDetailHospital] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  
  // Booking State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [doctorSlots, setDoctorSlots] = useState<any[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [bookedSlots, setBookedSlots] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingReason, setBookingReason] = useState("");
  const [consultationType, setConsultationType] = useState("routine");
  const [isBooking, setIsBooking] = useState(false);

  // Rating State
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Voice Search & Socket
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const { socket } = useSocketStore();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setVoiceSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
    }
  }, []);

  useEffect(() => {
    if (socket) {
      const handleHospitalUpdate = (data: any) => {
        setHospitals(prev => prev.map(h => h.id === data.hospitalId ? { ...h, bed_count: data.bedCount } : h));
        setNearbyHospitals(prev => prev.map(h => h.id === data.hospitalId ? { ...h, bed_count: data.bedCount } : h));
        setDetailHospital((prev: any) => prev && prev.id === data.hospitalId ? { ...prev, bed_count: data.bedCount } : prev);
      };

      const handleLocationUpdate = (data: any) => {
        setHospitals(prev => prev.map(h => h.id === data.hospitalId ? { ...h, latitude: data.latitude, longitude: data.longitude } : h));
        setNearbyHospitals(prev => prev.map(h => h.id === data.hospitalId ? { ...h, latitude: data.latitude, longitude: data.longitude } : h));
        setDetailHospital((prev: any) => prev && prev.id === data.hospitalId ? { ...prev, latitude: data.latitude, longitude: data.longitude } : prev);
      };
      
      socket.on('hospital_updated_global', handleHospitalUpdate);
      socket.on('hospital_location_updated_global', handleLocationUpdate);
      return () => {
        socket.off('hospital_updated_global', handleHospitalUpdate);
        socket.off('hospital_location_updated_global', handleLocationUpdate);
      };
    }
  }, [socket]);

  const startListening = () => {
    if (!voiceSupported) return;
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchTerm(transcript);
        fetchHospitals(transcript, selectedSpecialty);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (e) {
      console.error(e);
      setVoiceSupported(false);
    }
  };

  const generateIntervals = (slots: any[]) => {
    const intervals: any[] = [];
    slots.forEach(slot => {
      let current = new Date(`1970-01-01T${slot.start_time}`);
      const end = new Date(`1970-01-01T${slot.end_time}`);
      const duration = slot.slot_duration || 30;
      while (current < end) {
        const next = new Date(current.getTime() + duration * 60000);
        if (next > end) break;
        intervals.push({
          ...slot,
          id: `${slot.id}-${current.toTimeString().substring(0, 8)}`,
          parentSlotId: slot.id,
          start_time: current.toTimeString().substring(0, 8),
          end_time: next.toTimeString().substring(0, 8)
        });
        current = next;
      }
    });
    return intervals;
  };

  const openBookingModal = async (doctor: any) => {
    setSelectedDoctor(doctor);
    setBookingModalOpen(true);
    setSelectedDate(new Date());
    setSelectedSlot(null);
    setBookingReason("");
    setConsultationType("routine");
    try {
      const res: any = await api.get(`/doctors/${doctor.id}/slots`);
      setDoctorSlots(res.data || []);
      const blockRes: any = await api.get(`/doctors/${doctor.id}/blocked-slots`);
      setBlockedSlots(blockRes.data || []);
      const bookRes: any = await api.get(`/doctors/${doctor.id}/booked-appointments`);
      setBookedSlots(bookRes.data || []);
    } catch (e) {
      toast.error("Failed to load doctor availability");
    }
  };

  const handleBook = async () => {
    if (!selectedSlot || !selectedDate || !bookingReason) {
      toast.error("Please fill all required fields");
      return;
    }
    setIsBooking(true);
    try {
      await api.post("/appointments", {
        doctorId: selectedDoctor.id,
        hospitalId: detailHospital.id,
        slotId: selectedSlot.parentSlotId || selectedSlot.id,
        appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedSlot.start_time,
        endTime: selectedSlot.end_time,
        reason: consultationType === 'emergency' ? `[EMERGENCY] ${bookingReason}` : bookingReason,
        consultationType: "in_person"
      });
      toast.success("Appointment booked successfully!");
      setBookingModalOpen(false);
      // Optional: Refresh nearby data if needed
    } catch (error: any) {
      toast.error(error.message || "Time slot is already booked");
      setIsBooking(false);
      // Re-fetch booked slots so the UI reflects the booked slot
      try {
        const bookRes: any = await api.get(`/doctors/${selectedDoctor.id}/booked-appointments`);
        setBookedSlots(bookRes.data || []);
        setSelectedSlot(null);
      } catch (e) {}
    }
  };

  const handleSubmitRating = async () => {
    if (!detailHospital || ratingValue === 0) return;
    setIsSubmittingRating(true);
    try {
      const res = await api.post(`/hospitals/${detailHospital.id}/reviews`, {
        rating: ratingValue,
        comment: ratingComment
      });
      toast.success("Review submitted successfully!");
      setRatingModalOpen(false);
      // Update local state instantly
      const updatedRating = res.data.rating;
      const updatedTotalReviews = res.data.totalReviews;
      setDetailHospital((prev: any) => prev ? { ...prev, rating: updatedRating, total_reviews: updatedTotalReviews } : prev);
      setHospitals((prev: any) => prev.map((h: any) => h.id === detailHospital.id ? { ...h, rating: updatedRating, total_reviews: updatedTotalReviews } : h));
      setNearbyHospitals((prev: any) => prev.map((h: any) => h.id === detailHospital.id ? { ...h, rating: updatedRating, total_reviews: updatedTotalReviews } : h));
    } catch (error: any) {
      toast.error(error.message || "Failed to submit review");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  useEffect(() => {
    setFavorites(getFavorites());
    fetchHospitals();
    fetchSpecialties();
    detectLocation();
  }, []);

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          fetchNearby(loc[0], loc[1]);
        },
        () => console.log("Location denied")
      );
    }
  };

  const fetchHospitals = async (search = "", specialty = "") => {
    setLoading(true);
    try {
      let url = `/hospitals?limit=50`;
      if (search) url += `&search=${search}`;
      const res: any = await api.get(url);
      setHospitals(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchNearby = async (lat: number, lng: number) => {
    try {
      const res: any = await api.get(`/hospitals/nearby?lat=${lat}&lng=${lng}&radius=50`);
      setNearbyHospitals(res.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchSpecialties = async () => {
    try {
      const res: any = await api.get("/hospitals/specialties");
      setSpecialties(res.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchHospitalDetail = async (id: number) => {
    setDetailLoading(true);
    setShowPanel(true);
    try {
      const res: any = await api.get(`/hospitals/${id}`);
      setDetailHospital(res.data);
    } catch (e) { console.error(e); toast.error("Failed to load hospital details"); }
    finally { setDetailLoading(false); }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHospitals(searchTerm, selectedSpecialty);
  };

  const handleCardClick = (id: number) => {
    setActiveHospitalId(id);
    fetchHospitalDetail(id);
  };

  const handleToggleFavorite = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(toggleFavorite(id));
  };

  // Calculate distance helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const hospitalsWithDistance = hospitals.map(h => {
    if (userLocation && h.latitude && h.longitude) {
      return { ...h, distance: calculateDistance(userLocation[0], userLocation[1], parseFloat(h.latitude), parseFloat(h.longitude)) };
    }
    return h;
  });

  const displayHospitals = nearbyHospitals.length > 0 ? nearbyHospitals : hospitalsWithDistance;
  // Top Rated ignores distance, just uses rating
  const topRated = [...hospitalsWithDistance].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
  // Nearest available
  const nearestHospitals = userLocation ? [...hospitalsWithDistance].filter(h => h.distance !== undefined).sort((a, b) => a.distance - b.distance).slice(0, 5) : [];

  return (
    <DashboardLayout role="patient">
      <div className="h-[calc(100vh-7rem)] flex flex-col animate-in fade-in duration-500 -m-4 md:-m-6 lg:-m-8">
        
        {/* Top Bar: Search + Filters */}
        <div className="px-4 md:px-6 py-3 bg-white border-b border-gray-100 flex flex-wrap items-center gap-3 z-10">
          <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-md flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search hospitals, doctors, city..."
              className="pl-9 pr-10 h-10 bg-gray-50 border-gray-200 rounded-xl focus:bg-white w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {voiceSupported && (
              <button 
                type="button" 
                onClick={isListening ? undefined : startListening}
                className={`absolute right-2 p-1.5 rounded-lg transition-colors ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </form>
          <select
            value={selectedSpecialty}
            onChange={(e) => { setSelectedSpecialty(e.target.value); fetchHospitals(searchTerm, e.target.value); }}
            className="h-10 px-3 pr-8 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none min-w-[160px]"
          >
            <option value="">All Specialties</option>
            {specialties.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {userLocation && (
            <Badge className="bg-blue-50 text-blue-600 border-blue-100 gap-1 h-8 px-3 font-medium">
              <Navigation className="w-3 h-3" /> Location Active
            </Badge>
          )}
        </div>

        {/* Main Content: Cards + Map */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Left Panel: Hospital List */}
          <div className="w-full md:w-[380px] lg:w-[420px] flex-shrink-0 overflow-y-auto bg-white border-r border-gray-100 p-4 space-y-5">
            
            {/* Nearby Hospitals */}
            {nearbyHospitals.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><MapPin className="w-4 h-4 text-blue-500" /></div>
                  <h3 className="font-semibold text-sm text-gray-900">Nearby Hospitals</h3>
                  <Badge variant="secondary" className="ml-auto text-xs">{nearbyHospitals.length}</Badge>
                </div>
                <div className="space-y-4">
                  <AnimatePresence>
                    {nearbyHospitals.slice(0, 4).map((h) => (
                      <HospitalCard key={`near-${h.id}`} hospital={h} isActive={activeHospitalId === h.id} isFavorite={favorites.includes(h.id)} onClick={() => handleCardClick(h.id)} onFavorite={(e) => handleToggleFavorite(h.id, e)} showDistance />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Top Rated */}
            {topRated.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center"><Star className="w-4 h-4 text-amber-500" /></div>
                  <h3 className="font-semibold text-sm text-gray-900">Top Rated</h3>
                </div>
                <div className="space-y-4">
                  <AnimatePresence>
                    {topRated.map((h) => (
                      <HospitalCard key={`top-${h.id}`} hospital={h} isActive={activeHospitalId === h.id} isFavorite={favorites.includes(h.id)} onClick={() => handleCardClick(h.id)} onFavorite={(e) => handleToggleFavorite(h.id, e)} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* All Hospitals */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center"><Building2 className="w-4 h-4 text-emerald-500" /></div>
                <h3 className="font-semibold text-sm text-gray-900">All Hospitals</h3>
                <Badge variant="secondary" className="ml-auto text-xs">{hospitals.length}</Badge>
              </div>
              {loading ? (
                <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
              ) : hospitals.length > 0 ? (
                <div className="space-y-4 pb-20">
                  <AnimatePresence>
                    {hospitals.map((h) => (
                      <HospitalCard key={h.id} hospital={h} isActive={activeHospitalId === h.id} isFavorite={favorites.includes(h.id)} onClick={() => handleCardClick(h.id)} onFavorite={(e) => handleToggleFavorite(h.id, e)} />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hospitals found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Map Area */}
          <div className="flex-1 relative hidden md:block">
            <InteractiveMap
              hospitals={[...hospitals, ...nearbyHospitals.filter(n => !hospitals.find(h => h.id === n.id))]}
              activeHospitalId={activeHospitalId}
              detailHospital={detailHospital}
              onMarkerClick={handleCardClick}
              userLocation={userLocation}
            />
          </div>

          {/* Detail Slide-Over Panel */}
          <AnimatePresence>
            {showPanel && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" 
                  onClick={() => setShowPanel(false)} 
                />
                <motion.div 
                  initial={{ x: "100%", opacity: 0.5 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                  className="fixed md:absolute right-0 top-0 h-full w-full md:w-[420px] bg-white z-50 shadow-2xl border-l border-gray-100 overflow-y-auto"
                >
                  <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-lg">Hospital Details</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-gray-50 hover:bg-gray-100" onClick={() => { setShowPanel(false); setDetailHospital(null); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {detailLoading ? (
                    <div className="p-5 space-y-4">
                      <Skeleton className="h-48 rounded-2xl" />
                      <Skeleton className="h-8 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-32 rounded-xl mt-6" />
                    </div>
                  ) : detailHospital ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-5 space-y-6"
                    >
                      {/* Hospital Header Image */}
                      <div className="h-48 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center relative overflow-hidden shadow-inner">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
                        <Building2 className="w-20 h-20 text-white/20" />
                        <div className="absolute bottom-3 left-3 flex gap-2">
                          {detailHospital.is_active && <Badge className="bg-white/95 backdrop-blur-sm text-emerald-700 text-xs shadow-sm font-bold border-0">Open Now</Badge>}
                          {detailHospital.bed_count !== undefined && (
                            <Badge className={`bg-white/95 backdrop-blur-sm text-xs shadow-sm font-bold border-0 ${detailHospital.bed_count > 0 ? 'text-gray-800' : 'text-red-600'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${detailHospital.bed_count > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                              {detailHospital.bed_count} Beds Available
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Name & Rating */}
                      <div>
                        <div className="flex items-start justify-between">
                          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{detailHospital.name}</h2>
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg text-sm font-bold shadow-sm">
                            <Star className="w-3.5 h-3.5 fill-current" /> {detailHospital.rating || "New"}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-1 font-medium"><MapPin className="w-4 h-4 text-gray-400" /> {detailHospital.address_line1}, {detailHospital.city}, {detailHospital.state}</p>
                      {detailHospital.description && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{detailHospital.description}</p>}
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-4 gap-2">
                      <Button variant="outline" className="h-auto py-3 flex-col gap-1 rounded-xl text-xs border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700" onClick={() => detailHospital.phone && window.open(`tel:${detailHospital.phone}`)}>
                        <Phone className="w-4 h-4" /> Call
                      </Button>
                      <Button variant="outline" className="h-auto py-3 flex-col gap-1 rounded-xl text-xs border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700" onClick={() => detailHospital.latitude && window.open(`https://maps.google.com/?q=${detailHospital.latitude},${detailHospital.longitude}`)}>
                        <Navigation className="w-4 h-4" /> Directions
                      </Button>
                      <Button variant="outline" className={`h-auto py-3 flex-col gap-1 rounded-xl text-xs border-gray-200 ${favorites.includes(detailHospital.id) ? 'bg-red-50 border-red-200 text-red-600' : 'hover:bg-red-50'}`} onClick={(e) => handleToggleFavorite(detailHospital.id, e)}>
                        <Heart className={`w-4 h-4 ${favorites.includes(detailHospital.id) ? 'fill-current' : ''}`} /> {favorites.includes(detailHospital.id) ? "Saved" : "Save"}
                      </Button>
                      <Button variant="outline" className="h-auto py-3 flex-col gap-1 rounded-xl text-xs border-gray-200 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700" onClick={() => { setRatingValue(0); setRatingComment(""); setRatingModalOpen(true); }}>
                        <Star className="w-4 h-4" /> Rate
                      </Button>
                    </div>

                    {/* Info Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <Users className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{detailHospital.doctors?.length || 0}</p>
                        <p className="text-xs text-gray-500">Doctors</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <Stethoscope className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{detailHospital.departments?.length || 0}</p>
                        <p className="text-xs text-gray-500">Departments</p>
                      </div>
                    </div>

                    {/* Departments */}
                    {detailHospital.departments?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900 mb-2">Departments</h4>
                        <div className="flex flex-wrap gap-2">
                          {detailHospital.departments.map((d: any) => (
                            <Badge key={d.id} variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 rounded-lg py-1">{d.name}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Doctor Listing */}
                    {detailHospital.doctors?.length > 0 && (
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 mb-3 tracking-tight">Available Doctors</h4>
                        <div className="space-y-3">
                          {detailHospital.doctors.map((doc: any, i: number) => (
                            <motion.div 
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 + (i * 0.05) }}
                              key={doc.id} 
                              className="flex items-center gap-3 p-3.5 bg-white border border-gray-100 rounded-2xl hover:border-emerald-200 hover:shadow-md transition-all group"
                            >
                              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                                {doc.first_name?.charAt(0)}{doc.last_name?.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">Dr. {doc.first_name} {doc.last_name}</p>
                                <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">{doc.specialties || doc.qualification}</p>
                              </div>
                              <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                                <div className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded"><Star className="w-3 h-3 text-amber-500 fill-amber-500 mr-1" />{doc.rating || "New"}</div>
                                <Button size="sm" className="h-8 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold px-4 rounded-lg shadow-sm transition-colors" onClick={() => openBookingModal(doc)}>
                                  Book
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </motion.div>
            </>
          )}
          </AnimatePresence>
          
          {/* Booking Modal */}
          {selectedDoctor && (
            <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
              <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
                <div className="bg-emerald-600 p-6 text-white">
                  <DialogTitle className="text-xl font-bold">Book Appointment</DialogTitle>
                  <DialogDescription className="text-emerald-100 mt-1">
                    Dr. {selectedDoctor.first_name} {selectedDoctor.last_name} • {detailHospital?.name}
                  </DialogDescription>
                </div>
                
                <div className="p-6 space-y-7 bg-white max-h-[65vh] overflow-y-auto custom-scrollbar">
                  
                  {/* Visit Category */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-900 tracking-tight">Visit Category</label>
                    <div className="grid grid-cols-2 gap-4">
                      {['routine', 'emergency'].map(type => (
                        <button
                          key={type}
                          onClick={() => setConsultationType(type)}
                          className={`p-3.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${consultationType === type ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm' : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50'}`}
                        >
                          <span className="capitalize">{type}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-900 tracking-tight">Select Date</label>
                    <div className="flex gap-3 overflow-x-auto pb-3 -mx-2 px-2 snap-x hide-scrollbar">
                      {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                        const date = addDays(new Date(), offset);
                        const isSelected = isSameDay(date, selectedDate);
                        return (
                          <button
                            key={offset}
                            onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                            className={`flex flex-col items-center justify-center w-16 h-20 rounded-2xl border-2 flex-shrink-0 transition-all duration-200 snap-center ${isSelected ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 transform scale-105' : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200 hover:bg-emerald-50/30'}`}
                          >
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-emerald-100' : 'text-gray-400'}`}>{format(date, 'EEE')}</span>
                            <span className={`text-xl font-black mt-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>{format(date, 'd')}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slot Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-900 tracking-tight">Available Time</label>
                    {doctorSlots.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-medium text-gray-500 text-center flex flex-col items-center gap-2">
                        <Clock className="w-6 h-6 text-gray-400" />
                        No slots available for this doctor.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {generateIntervals(doctorSlots)
                           .filter(s => parseInt(s.day_of_week) === selectedDate.getDay())
                           .filter(s => {
                             // Check against blocked slots
                             const slotStartHour = parseInt(s.start_time.split(':')[0]);
                             const isBlocked = blockedSlots.some(b => 
                               isSameDay(new Date(b.block_date), selectedDate) && 
                               parseInt(b.start_time.split(':')[0]) <= slotStartHour && 
                               parseInt(b.end_time.split(':')[0]) > slotStartHour
                             );
                             if (isBlocked) return false;

                             // Check against current time for today
                             if (isSameDay(selectedDate, new Date())) {
                               const now = new Date();
                               const [hours, minutes] = s.start_time.split(':').map(Number);
                               if (hours < now.getHours() || (hours === now.getHours() && minutes <= now.getMinutes())) {
                                 return false; // Filter out past slots
                               }
                             }
                             return true;
                           })
                           .map(slot => {
                          const isSelected = selectedSlot?.id === slot.id;
                          const slotStartHour = parseInt(slot.start_time.split(':')[0]);
                          const slotStartMin = parseInt(slot.start_time.split(':')[1]);
                          
                          // Check if booked
                          const isBooked = bookedSlots.some(b => {
                            if (!isSameDay(new Date(b.block_date), selectedDate)) return false;
                            const bStartH = parseInt(b.start_time.split(':')[0]);
                            const bStartM = parseInt(b.start_time.split(':')[1]);
                            const bEndH = parseInt(b.end_time.split(':')[0]);
                            const bEndM = parseInt(b.end_time.split(':')[1]);
                            
                            const slotTime = slotStartHour * 60 + slotStartMin;
                            const bookStart = bStartH * 60 + bStartM;
                            const bookEnd = bEndH * 60 + bEndM;
                            
                            return slotTime >= bookStart && slotTime < bookEnd;
                          });

                          return (
                            <button
                              key={slot.id}
                              onClick={() => !isBooked && setSelectedSlot(slot)}
                              disabled={isBooked}
                              className={`p-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-200 
                                ${isBooked ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed opacity-60' :
                                  isSelected ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/25 transform scale-105' : 
                                  'border-gray-100 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'}`}
                            >
                              {slot.start_time.substring(0,5)}
                            </button>
                          );
                        })}
                        {generateIntervals(doctorSlots).filter(s => parseInt(s.day_of_week) === selectedDate.getDay()).filter(s => {
                             const slotStartHour = parseInt(s.start_time.split(':')[0]);
                             const isBlocked = blockedSlots.some(b => 
                               isSameDay(new Date(b.block_date), selectedDate) && 
                               parseInt(b.start_time.split(':')[0]) <= slotStartHour && 
                               parseInt(b.end_time.split(':')[0]) > slotStartHour
                             );
                             if (isBlocked) return false;

                             if (isSameDay(selectedDate, new Date())) {
                               const now = new Date();
                               const [hours, minutes] = s.start_time.split(':').map(Number);
                               if (hours < now.getHours() || (hours === now.getHours() && minutes <= now.getMinutes())) {
                                 return false;
                               }
                             }
                             return true;
                           }).length === 0 && (
                           <div className="col-span-3 sm:col-span-4 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium text-center border border-red-100">
                             No slots available on this date.
                           </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reason */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-900 tracking-tight">Reason for Visit</label>
                    <textarea 
                      placeholder="E.g., General checkup, fever, continuous headache..." 
                      value={bookingReason}
                      onChange={(e) => setBookingReason(e.target.value)}
                      className="w-full p-4 rounded-xl bg-gray-50 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-none min-h-[100px] text-sm text-gray-900 placeholder-gray-400"
                    />
                  </div>

                </div>
                
                <DialogFooter className="bg-gray-50/80 backdrop-blur-sm pt-4 pb-6 px-6 sm:pb-8 border-t border-gray-100 mt-auto">
                  <Button variant="ghost" className="font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl" onClick={() => setBookingModalOpen(false)}>Cancel</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 rounded-xl px-8 font-bold" onClick={handleBook} disabled={isBooking || !selectedSlot || !bookingReason}>
                    {isBooking ? 'Booking...' : 'Confirm Booking'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Rating Modal */}
          {detailHospital && (
            <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}>
              <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
                <div className="bg-amber-500 p-6 text-white text-center">
                  <Star className="w-12 h-12 mx-auto fill-current text-white mb-2" />
                  <DialogTitle className="text-xl font-bold">Rate Your Experience</DialogTitle>
                  <DialogDescription className="text-amber-100 mt-1">
                    {detailHospital.name}
                  </DialogDescription>
                </div>
                
                <div className="p-6 space-y-6 bg-white">
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="transition-all duration-200 transform hover:scale-110 focus:outline-none"
                        onMouseEnter={() => setRatingHover(star)}
                        onMouseLeave={() => setRatingHover(0)}
                        onClick={() => setRatingValue(star)}
                      >
                        <Star
                          className={`w-10 h-10 ${(ratingHover || ratingValue) >= star ? "text-amber-400 fill-amber-400" : "text-gray-200"}`}
                        />
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-900 tracking-tight">Add a Comment (Optional)</label>
                    <textarea 
                      placeholder="Share details of your own experience at this hospital..." 
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      className="w-full p-4 rounded-xl bg-gray-50 focus:bg-white border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none transition-all resize-none min-h-[100px] text-sm text-gray-900 placeholder-gray-400"
                    />
                  </div>
                </div>
                
                <DialogFooter className="bg-gray-50/80 backdrop-blur-sm p-4 sm:p-6 border-t border-gray-100">
                  <Button variant="ghost" className="font-semibold text-gray-600 rounded-xl" onClick={() => setRatingModalOpen(false)}>Cancel</Button>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 rounded-xl px-8 font-bold" onClick={handleSubmitRating} disabled={isSubmittingRating || ratingValue === 0}>
                    {isSubmittingRating ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}

function HospitalCard({ hospital, isActive, isFavorite, onClick, onFavorite, showDistance }: {
  hospital: any; isActive: boolean; isFavorite: boolean; onClick: () => void; onFavorite: (e: React.MouseEvent) => void; showDistance?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`group relative p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
        isActive 
          ? "border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-white shadow-lg shadow-emerald-500/20" 
          : "border border-gray-100 bg-white hover:border-emerald-200 hover:shadow-md"
      }`}
    >
      <button onClick={onFavorite} className="absolute top-4 right-4 z-10 p-1.5 rounded-full hover:bg-gray-100 transition-colors">
        <Heart className={`w-4 h-4 transition-colors ${isFavorite ? "text-red-500 fill-red-500" : "text-gray-300 group-hover:text-red-400"}`} />
      </button>
      
      <div className="flex items-start gap-3">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? 'bg-emerald-500 text-white shadow-inner' : 'bg-emerald-50 border border-emerald-100 text-emerald-500'}`}>
          <Building2 className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-gray-900 truncate pr-6">{hospital.name}</h4>
            {hospital.is_verified && <Badge variant="secondary" className="bg-blue-50 text-blue-600 px-1 py-0 h-4 text-[10px]">Verified</Badge>}
          </div>
          
          <p className="text-xs text-gray-500 flex items-center gap-1 truncate mb-2">
            <MapPin className="w-3 h-3 flex-shrink-0" /> {hospital.city}{hospital.state ? `, ${hospital.state}` : ""}
          </p>
          
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="flex items-center text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
              <Star className="w-3 h-3 fill-current mr-0.5" /> {hospital.rating || "New"}
            </span>
            <span className="text-[11px] font-medium text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded-md flex items-center">
              <Users className="w-3 h-3 mr-1 text-blue-500" /> {hospital.doctor_count || 0}
            </span>
            {hospital.bed_count !== undefined && (
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md flex items-center ${hospital.bed_count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${hospital.bed_count > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                {hospital.bed_count} Beds
              </span>
            )}
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${hospital.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{hospital.is_active ? 'Open Now' : 'Closed'}</span>
            </div>
            {showDistance && hospital.distance && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                {hospital.distance.toFixed(1)} km away
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
