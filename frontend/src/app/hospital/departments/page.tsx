"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2, Plus, Pencil, Trash2, Search, Loader2,
  MoreVertical, Layers, Users as UsersIcon, Clock
} from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Department {
  id: number;
  name: string;
  description: string | null;
  floor_number: string | null;
  is_active: boolean;
  doctor_count: number;
  created_at: string;
}

const DEPARTMENT_ICONS: Record<string, string> = {
  Cardiology: "❤️", Neurology: "🧠", Orthopedics: "🦴", Pediatrics: "👶",
  Dermatology: "🧴", Ophthalmology: "👁️", ENT: "👂", Gynecology: "🩺",
  Radiology: "📷", Oncology: "🎗️", Psychiatry: "🧘", Dentistry: "🦷",
  Pulmonology: "🫁", Urology: "💊", "General Medicine": "🏥",
  "Emergency Medicine": "🚑", Surgery: "🔪", Anesthesiology: "💉",
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  
  // Extended form state for the new requested tabs
  const [form, setForm] = useState({ 
    name: "", description: "", floorNumber: "", 
    type: "", timings: "", capacity: "", emergency: false 
  });

  const fetchDepartments = useCallback(async () => {
    try {
      const res: any = await api.get("/hospital-manage/departments");
      setDepartments(res.data || []);
    } catch { toast.error("Failed to load departments"); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  const openCreateDialog = () => {
    setEditingDept(null);
    setForm({ name: "", description: "", floorNumber: "", type: "", timings: "", capacity: "", emergency: false });
    setDialogOpen(true);
  };

  const openEditDialog = (dept: Department) => {
    setEditingDept(dept);
    setForm({ 
      name: dept.name, 
      description: dept.description || "", 
      floorNumber: dept.floor_number || "",
      type: "", timings: "", capacity: "", emergency: false // Default placeholders for edit
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Department name is required"); return; }
    setIsSubmitting(true);
    try {
      if (editingDept) {
        await api.put(`/hospital-manage/departments/${editingDept.id}`, form);
        toast.success("Department updated successfully");
      } else {
        await api.post("/hospital-manage/departments", form);
        toast.success("Department created successfully");
      }
      setDialogOpen(false);
      fetchDepartments();
    } catch (err: any) { toast.error(err.message || "Operation failed"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (dept: Department) => {
    if (dept.doctor_count > 0) {
      toast.error(`Cannot delete: ${dept.doctor_count} doctor(s) assigned`);
      return;
    }
    try {
      await api.delete(`/hospital-manage/departments/${dept.id}`);
      toast.success("Department deleted");
      fetchDepartments();
    } catch (err: any) { toast.error(err.message || "Failed to delete"); }
  };

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIcon = (name: string) => {
    return DEPARTMENT_ICONS[name] || "🏢";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 w-full max-w-7xl mx-auto pb-12 pt-4">
      {/* ─── Premium Header ─── */}
      <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-[28px] p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white flex-shrink-0">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mb-1">Departments</h1>
            <p className="text-sm text-gray-500 font-medium">Manage hospital departments, assign clinical locations, and oversee operations.</p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="w-full sm:w-auto bg-[#10b981] hover:bg-[#059669] text-white rounded-xl shadow-lg shadow-emerald-500/20 h-12 px-6 font-bold transition-all hover:scale-105 active:scale-95">
          <Plus className="w-5 h-5 mr-2" /> Add Department
        </Button>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="bg-white/80 backdrop-blur-xl p-2 pl-4 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col sm:flex-row justify-between items-center gap-4 transition-all focus-within:border-emerald-200 focus-within:ring-4 focus-within:ring-emerald-50">
        <div className="relative flex-1 w-full flex items-center">
          <Search className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
          <input
            placeholder="Search departments by name or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm font-medium focus:outline-none focus:ring-0 text-gray-900 placeholder:text-gray-400 py-3 w-full"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50/80 rounded-xl text-sm font-semibold text-gray-700 whitespace-nowrap">
             Total <Badge className="bg-white text-gray-900 shadow-sm border-gray-200">{departments.length}</Badge>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50/80 rounded-xl text-sm font-semibold text-emerald-700 whitespace-nowrap">
             Active <Badge className="bg-emerald-500 text-white shadow-sm border-0">{departments.filter(d => d.is_active).length}</Badge>
          </div>
        </div>
      </div>

      {/* ─── Department Grid ─── */}
      {isLoading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/50 backdrop-blur-sm rounded-[28px] border border-gray-100 shadow-sm py-20 flex flex-col items-center justify-center text-center px-4">
          <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-5 border border-gray-100 shadow-inner">
            <Building2 className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No departments found</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">We couldn't find any departments matching your criteria. Try adjusting your search or add a new one.</p>
          <Button onClick={openCreateDialog} variant="outline" className="rounded-xl h-11 px-6 font-semibold border-gray-200 hover:bg-gray-50">
            <Plus className="w-4 h-4 mr-2" /> Create Department
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((dept) => (
            <div key={dept.id} className="group relative bg-white/90 backdrop-blur-xl border border-gray-100 rounded-[28px] p-6 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-500 overflow-hidden flex flex-col">
              {/* Subtle Animated Top Gradient */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="flex items-start justify-between mb-5 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border border-indigo-100/50 flex items-center justify-center text-[26px] shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                    {getIcon(dept.name)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-lg mb-1 group-hover:text-emerald-700 transition-colors line-clamp-1">{dept.name}</h3>
                    {dept.is_active ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactive
                      </span>
                    )}
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger className="h-9 w-9 text-gray-400 hover:text-gray-900 hover:bg-gray-100/80 rounded-full inline-flex items-center justify-center focus:outline-none transition-colors border border-transparent hover:border-gray-200">
                    <MoreVertical className="w-5 h-5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-gray-100 w-44 p-1">
                    <DropdownMenuItem onClick={() => openEditDialog(dept)} className="cursor-pointer rounded-lg py-2 focus:bg-gray-50 font-semibold text-gray-700">
                      <Pencil className="w-4 h-4 mr-2 text-gray-400" /> Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(dept)} className="cursor-pointer rounded-lg py-2 text-red-600 focus:text-red-700 focus:bg-red-50 font-semibold mt-1">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="bg-gray-50/70 border border-gray-100/60 rounded-2xl p-4 mb-6 group-hover:bg-indigo-50/40 group-hover:border-indigo-100/50 transition-colors duration-500 relative z-10">
                <p className="text-[13px] text-gray-600 leading-relaxed line-clamp-2 min-h-[40px] font-medium">
                  {dept.description || "No specific details or clinical description provided for this department."}
                </p>
              </div>
              
              <div className="mt-auto grid grid-cols-2 gap-3 mb-5 relative z-10">
                <div className="bg-white/80 border border-gray-100 rounded-2xl p-3.5 shadow-sm group-hover:border-emerald-100 transition-colors duration-500">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" /> Location
                  </p>
                  <p className="text-[13px] font-bold text-gray-800">{dept.floor_number ? `Floor ${dept.floor_number}` : "Not Assigned"}</p>
                </div>
                <div className="bg-white/80 border border-gray-100 rounded-2xl p-3.5 shadow-sm group-hover:border-teal-100 transition-colors duration-500">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Established
                  </p>
                  <p className="text-[13px] font-bold text-gray-800">{dept.created_at ? format(new Date(dept.created_at), "MMM yyyy") : "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-gray-100/80 relative z-10">
                <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">Medical Staff</span>
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-extrabold text-gray-900">
                    {dept.doctor_count > 0 ? `${dept.doctor_count}` : '0'}
                  </span>
                  <div className="flex -space-x-2.5 relative z-0">
                    {[...Array(Math.min(3, dept.doctor_count))].map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-[10px] font-bold text-emerald-800 shadow-md ring-1 ring-gray-100/50 transform hover:scale-110 hover:z-10 transition-transform">
                        D{i+1}
                      </div>
                    ))}
                    {dept.doctor_count > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-600 shadow-md ring-1 ring-gray-100/50">
                        +{dept.doctor_count - 3}
                      </div>
                    )}
                    {dept.doctor_count === 0 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-50 flex items-center justify-center shadow-md ring-1 ring-gray-100/50">
                         <UsersIcon className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Advanced Create/Edit Dialog with Tabs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[28px] p-0 overflow-hidden bg-white/95 backdrop-blur-xl border border-gray-100 shadow-[0_20px_60px_rgb(0,0,0,0.1)]">
          <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 px-7 py-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-extrabold text-gray-900">
                {editingDept ? "Edit Department" : "Create New Department"}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1 font-medium">Configure clinical division details and operations.</p>
            </div>
            <div className="w-12 h-12 rounded-[16px] bg-white shadow-sm flex items-center justify-center border border-gray-100">
               <Building2 className="w-6 h-6 text-emerald-500" />
            </div>
          </div>

          <div className="p-7 pb-4">
            <Tabs defaultValue="basic" className="w-full flex-col">
              <TabsList className="grid w-full h-12 grid-cols-2 mb-7 bg-gray-50/80 p-1.5 rounded-[14px]">
                <TabsTrigger value="basic" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm transition-all text-gray-500 text-[13px] h-full">Basic Info</TabsTrigger>
                <TabsTrigger value="operational" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm transition-all text-gray-500 text-[13px] h-full">Operations</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-5 focus:outline-none data-[state=inactive]:hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="text-[13px] font-bold text-gray-700 mb-2 block">Department Name *</label>
                    <Input placeholder="e.g. Cardiology" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-12 rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 bg-gray-50/50 hover:bg-white transition-colors text-sm font-medium" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[13px] font-bold text-gray-700 mb-2 block">Department Type</label>
                    <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })}>
                      <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white transition-colors text-sm font-medium">
                        <SelectValue placeholder="Select clinical category..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                        <SelectItem value="clinical" className="rounded-lg font-medium">Clinical Services</SelectItem>
                        <SelectItem value="surgical" className="rounded-lg font-medium">Surgical Ward</SelectItem>
                        <SelectItem value="diagnostic" className="rounded-lg font-medium">Diagnostic & Imaging</SelectItem>
                        <SelectItem value="support" className="rounded-lg font-medium">Support & Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[13px] font-bold text-gray-700 mb-2 block">Description</label>
                    <textarea placeholder="Brief description of this department..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="flex w-full rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/10 min-h-[110px] resize-none transition-all" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="operational" className="space-y-5 focus:outline-none data-[state=inactive]:hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-[13px] font-bold text-gray-700 mb-2 block">Floor Location</label>
                    <Input placeholder="e.g. Ground Floor, Level 3" value={form.floorNumber} onChange={e => setForm({ ...form, floorNumber: e.target.value })} className="h-12 rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 bg-gray-50/50 hover:bg-white transition-colors text-sm font-medium" />
                  </div>
                  <div>
                    <label className="text-[13px] font-bold text-gray-700 mb-2 block">Operating Timings</label>
                    <Input placeholder="e.g. 24/7 or 9 AM - 5 PM" value={form.timings} onChange={e => setForm({ ...form, timings: e.target.value })} className="h-12 rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 bg-gray-50/50 hover:bg-white transition-colors text-sm font-medium" />
                  </div>
                  <div>
                    <label className="text-[13px] font-bold text-gray-700 mb-2 block">Bed Capacity</label>
                    <Input type="number" placeholder="Total beds" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} className="h-12 rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 bg-gray-50/50 hover:bg-white transition-colors text-sm font-medium" />
                  </div>
                  <div className="flex items-center h-full pt-7 pl-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={form.emergency} onChange={e => setForm({ ...form, emergency: e.target.checked })} />
                        <div className={`block w-11 h-6 rounded-full transition-colors duration-300 ${form.emergency ? 'bg-red-500' : 'bg-gray-200 group-hover:bg-gray-300'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${form.emergency ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                      <div>
                        <span className="text-[13px] font-bold text-gray-800 block">Emergency</span>
                        <span className="text-[11px] text-gray-500 font-medium">Available 24/7</span>
                      </div>
                    </label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="gap-3 px-7 py-5 bg-gray-50/80 border-t border-gray-100">
            <DialogClose className="rounded-xl border border-gray-200 bg-white shadow-sm px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              Cancel
            </DialogClose>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-[#10b981] hover:bg-[#059669] text-white rounded-xl shadow-lg shadow-emerald-500/20 h-11 px-7 font-bold transition-all hover:scale-105 active:scale-95">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingDept ? "Save Changes" : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
