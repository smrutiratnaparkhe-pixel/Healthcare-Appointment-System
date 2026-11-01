"use client";

import { useEffect, useState } from "react";
import { Building2, Search, Plus, MapPin, Phone, Users, Activity, MoreVertical, Trash2, Edit, ShieldCheck, Clock, Ban } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Suspend Confirmation State
  const [suspendConfirmOpen, setSuspendConfirmOpen] = useState(false);
  const [hospitalToSuspend, setHospitalToSuspend] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', city: '', state: '', registrationNumber: '', bedCount: 100
  });

  const fetchHospitals = async (statusFilter = activeTab) => {
    try {
      setIsLoading(true);
      const query = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res: any = await api.get(`/hospitals/admin/all${query}`);
      setHospitals(res.data || []);
    } catch (error) {
      console.error("Failed to fetch hospitals", error);
      toast.error("Failed to load hospitals");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals(activeTab);
  }, [activeTab]);

  const handleStatusUpdate = async (id: number, status: 'approve' | 'suspend' | 'reject') => {
    if (status === 'suspend') {
      setHospitalToSuspend(id);
      setSuspendConfirmOpen(true);
      return;
    }
    await executeStatusUpdate(id, status);
  };

  const executeStatusUpdate = async (id: number, status: 'approve' | 'suspend' | 'reject') => {
    try {
      await api.put(`/hospitals/${id}/status`, { status });
      toast.success(`Hospital ${status}d successfully`);
      fetchHospitals();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${status} hospital`);
    }
  };

  const confirmSuspend = async () => {
    if (hospitalToSuspend) {
      await executeStatusUpdate(hospitalToSuspend, 'suspend');
      setSuspendConfirmOpen(false);
      setHospitalToSuspend(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.post('/hospitals', formData);
      toast.success("Hospital successfully registered!");
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', phone: '', city: '', state: '', registrationNumber: '', bedCount: 100 });
      fetchHospitals();
    } catch (error: any) {
      toast.error(error.message || "Failed to create hospital");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHospitals = hospitals.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full h-full pb-10">
      
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Registered Hospitals</h1>
            <p className="text-sm text-gray-500">Manage partner clinics, approve applications, and enforce access.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search hospitals..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981]"
            />
          </div>
          
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-[#10b981] hover:bg-[#059669] text-white shadow-sm shadow-emerald-500/20 h-10 rounded-lg">
            <Plus className="w-4 h-4 mr-2" /> Add Hospital
          </Button>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent className="sm:max-w-[500px] bg-white rounded-[20px] p-6 border-0 shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">Register New Hospital</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-4 mt-4">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-500">Hospital Name</Label>
                  <Input required placeholder="Apollo Hospitals" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-10 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-500">Email</Label>
                    <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-10 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-500">Phone</Label>
                    <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-10 rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-500">City</Label>
                    <Input required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="h-10 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-500">State</Label>
                    <Input required value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="h-10 rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-500">Reg Number</Label>
                    <Input required value={formData.registrationNumber} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} className="h-10 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-500">Bed Capacity</Label>
                    <Input required type="number" value={formData.bedCount} onChange={e => setFormData({...formData, bedCount: Number(e.target.value)})} className="h-10 rounded-lg" />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-lg h-10 border-gray-200">Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-[#10b981] hover:bg-[#059669] text-white rounded-lg h-10">
                    {isSubmitting ? "Registering..." : "Complete Registration"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Suspend Confirmation Dialog */}
          <Dialog open={suspendConfirmOpen} onOpenChange={setSuspendConfirmOpen}>
            <DialogContent className="sm:max-w-[400px] bg-white rounded-[20px] p-6 border-0 shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-red-500" />
                  Suspend Hospital
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to suspend this hospital? This will instantly revoke platform access for all associated doctors, staff, and administrators.
                </p>
                <p className="text-xs text-red-500 font-medium mt-2 bg-red-50 p-2 rounded-lg border border-red-100">
                  This action is reversible, but may disrupt ongoing clinical operations.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSuspendConfirmOpen(false)} className="rounded-lg h-10 border-gray-200">
                  Cancel
                </Button>
                <Button onClick={confirmSuspend} className="bg-red-500 hover:bg-red-600 text-white rounded-lg h-10 shadow-sm">
                  Yes, Suspend Access
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full mb-6">
        <TabsList className="bg-gray-100/50 p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg px-6 py-2">All Records</TabsTrigger>
          <TabsTrigger value="active" className="rounded-lg px-6 py-2">Verified</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg px-6 py-2 flex items-center gap-2">
            Pending Review
            <span className="flex h-2 w-2 rounded-full bg-amber-500" />
          </TabsTrigger>
          <TabsTrigger value="suspended" className="rounded-lg px-6 py-2">Suspended</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 w-full rounded-[20px]" />)}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredHospitals.map((hospital) => {
            const isVerified = hospital.is_verified === 1;
            const isActive = hospital.is_active === 1;
            
            return (
              <Card key={hospital.id} className="bg-white border border-gray-100/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] transition-all duration-300 rounded-[20px] overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${isVerified && isActive ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : !isVerified ? 'bg-amber-50 border-amber-100 text-amber-500' : 'bg-red-50 border-red-100 text-red-500'}`}>
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-[16px] leading-tight truncate max-w-[180px] flex items-center gap-2">
                          {hospital.name}
                          {isVerified && isActive && <ShieldCheck className="w-4 h-4 text-[#10b981]" />}
                        </h3>
                        <div className="flex items-center text-xs font-medium text-gray-500 mt-1">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {hospital.city}, {hospital.state}
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full inline-flex items-center justify-center focus:outline-none">
                        <MoreVertical className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        {!isVerified && (
                          <>
                            <DropdownMenuItem onClick={() => handleStatusUpdate(hospital.id, 'approve')} className="text-emerald-600 focus:text-emerald-600 cursor-pointer">
                              <ShieldCheck className="w-4 h-4 mr-2" /> Approve Application
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusUpdate(hospital.id, 'reject')} className="text-red-600 focus:text-red-600 cursor-pointer">
                              <Ban className="w-4 h-4 mr-2" /> Reject Application
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {isVerified && isActive && (
                          <DropdownMenuItem onClick={() => handleStatusUpdate(hospital.id, 'suspend')} className="text-amber-600 focus:text-amber-600 cursor-pointer">
                            <Ban className="w-4 h-4 mr-2" /> Suspend Access
                          </DropdownMenuItem>
                        )}
                        {isVerified && !isActive && (
                          <DropdownMenuItem onClick={() => handleStatusUpdate(hospital.id, 'approve')} className="text-emerald-600 focus:text-emerald-600 cursor-pointer">
                            <ShieldCheck className="w-4 h-4 mr-2" /> Restore Access
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Contact</span>
                      <div className="flex items-center text-sm font-medium text-gray-700">
                        <Phone className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                        {hospital.phone || 'N/A'}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Doctors</span>
                      <div className="flex items-center text-sm font-medium text-gray-700">
                        <Users className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                        {hospital.doctor_count || 0} Listed
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                     <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Capacity</span>
                      <div className="flex items-center text-sm font-medium text-gray-700">
                        <Activity className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
                        {hospital.bed_count || 100} Beds
                      </div>
                    </div>
                    <div className="flex flex-col items-start justify-center">
                      {!isVerified ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 shadow-none text-[10px] uppercase font-bold tracking-wider">
                          <Clock className="w-3 h-3 mr-1" /> Pending
                        </Badge>
                      ) : isActive ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 shadow-none text-[10px] uppercase font-bold tracking-wider">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 shadow-none text-[10px] uppercase font-bold tracking-wider">
                          <Ban className="w-3 h-3 mr-1" /> Suspended
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredHospitals.length === 0 && !isLoading && (
            <div className="col-span-full py-16 text-center bg-white rounded-[20px] border border-dashed border-gray-200">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No hospitals found in this category.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
