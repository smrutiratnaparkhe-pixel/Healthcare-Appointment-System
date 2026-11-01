"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Stethoscope, Plus, Pencil, Trash2, Search, Loader2, MoreVertical,
  Copy, CheckCircle2, XCircle, Key, Mail, Phone, GraduationCap, Clock, IndianRupee
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

interface Doctor {
  id: number; user_id: number; department_id: number | null;
  first_name: string; last_name: string; email: string; phone: string | null;
  avatar_url: string | null; qualification: string | null; experience_years: number;
  consultation_fee: number; bio: string | null; is_available: boolean;
  rating: number; department_name: string | null; specialties: string | null;
  license_number: string | null; first_login_completed: boolean; is_active: number | boolean;
}

interface Department { id: number; name: string; }
interface Specialty { id: number; name: string; icon: string; }

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  // Credentials dialog
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    departmentId: "", specialtyIds: [] as number[],
    qualification: "", experienceYears: "", consultationFee: "",
    bio: "", licenseNumber: "", maxPatientsPerDay: "20",
  });

  const fetchAll = useCallback(async () => {
    try {
      const [docRes, deptRes, specRes]: any[] = await Promise.all([
        api.get("/hospital-manage/doctors"),
        api.get("/hospital-manage/departments"),
        api.get("/hospital-manage/specialties"),
      ]);
      setDoctors(docRes.data || []);
      setDepartments(deptRes.data || []);
      setSpecialties(specRes.data || []);
    } catch { toast.error("Failed to load data"); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreateDialog = () => {
    setEditingDoctor(null);
    setForm({
      firstName: "", lastName: "", email: "", phone: "",
      departmentId: "", specialtyIds: [],
      qualification: "", experienceYears: "", consultationFee: "",
      bio: "", licenseNumber: "", maxPatientsPerDay: "20",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (doc: Doctor) => {
    setEditingDoctor(doc);
    setForm({
      firstName: doc.first_name, lastName: doc.last_name, email: doc.email, phone: doc.phone || "",
      departmentId: doc.department_id?.toString() || "",
      specialtyIds: doc.specialties ? [] : [], // specialties are comma-separated names, need to map
      qualification: doc.qualification || "", experienceYears: doc.experience_years?.toString() || "",
      consultationFee: doc.consultation_fee?.toString() || "", bio: doc.bio || "",
      licenseNumber: doc.license_number || "", maxPatientsPerDay: "20",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || null,
        departmentId: form.departmentId ? parseInt(form.departmentId) : null,
        specialtyIds: form.specialtyIds,
        qualification: form.qualification,
        experienceYears: form.experienceYears ? parseInt(form.experienceYears) : 0,
        consultationFee: form.consultationFee ? parseFloat(form.consultationFee) : 0,
        bio: form.bio,
        licenseNumber: form.licenseNumber,
        maxPatientsPerDay: form.maxPatientsPerDay ? parseInt(form.maxPatientsPerDay) : 20,
      };

      if (editingDoctor) {
        await api.put(`/hospital-manage/doctors/${editingDoctor.id}`, payload);
        toast.success("Doctor updated successfully");
        setDialogOpen(false);
      } else {
        const res: any = await api.post("/hospital-manage/doctors", payload);
        toast.success("Doctor account created successfully");
        setDialogOpen(false);

        // Show credentials dialog
        setCredentials({
          email: form.email,
          tempPassword: res.data.tempPassword,
        });
        setCredDialogOpen(true);
      }
      fetchAll();
    } catch (err: any) { toast.error(err.message || "Operation failed"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (doc: Doctor) => {
    try {
      await api.delete(`/hospital-manage/doctors/${doc.id}`);
      toast.success("Doctor deactivated");
      fetchAll();
    } catch (err: any) { toast.error(err.message || "Failed to deactivate"); }
  };

  const handleActivate = async (doc: Doctor) => {
    try {
      await api.put(`/hospital-manage/doctors/${doc.id}/activate`);
      toast.success("Doctor reactivated");
      fetchAll();
    } catch (err: any) { toast.error(err.message || "Failed to reactivate"); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const toggleSpecialty = (specId: number) => {
    setForm(prev => ({
      ...prev,
      specialtyIds: prev.specialtyIds.includes(specId)
        ? prev.specialtyIds.filter(id => id !== specId)
        : [...prev.specialtyIds, specId],
    }));
  };

  const filtered = doctors.filter(d =>
    `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.department_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Doctors</h1>
            <p className="text-sm text-gray-500">Manage doctor accounts, credentials, and assignments.</p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="bg-[#10b981] hover:bg-[#059669] text-white rounded-xl shadow-lg shadow-emerald-500/20 px-5">
          <Plus className="w-4 h-4 mr-2" /> Add Doctor
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search doctors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-10 rounded-xl border-gray-200 shadow-sm" />
        </div>
        <Badge className="bg-gray-50 text-gray-700 border border-gray-200 shadow-none rounded-lg px-3 py-1.5 hover:bg-gray-50">
          Total: {doctors.length}
        </Badge>
      </div>

      {/* Doctor List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-[20px] border-gray-100/60 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 border border-gray-100">
              <Stethoscope className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No doctors found</h3>
            <p className="text-gray-500 text-sm mb-4">Add your first doctor to start building your medical team.</p>
            <Button onClick={openCreateDialog} variant="outline" className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Add Doctor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <Card key={doc.id} className="bg-white border border-gray-100/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] transition-all duration-300 rounded-[20px] overflow-hidden group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 rounded-xl border-2 border-white shadow-sm">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-xl text-sm font-bold">
                        {doc.first_name?.charAt(0)}{doc.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className={`font-semibold text-[15px] ${!doc.is_active ? 'text-gray-500 line-through' : 'text-gray-900'}`}>Dr. {doc.first_name} {doc.last_name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 font-medium">{doc.department_name || "Unassigned"}</span>
                        {!doc.is_active && (
                          <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-600 uppercase">Inactive</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-8 w-8 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-full inline-flex items-center justify-center hover:bg-gray-100 focus:outline-none">
                        <MoreVertical className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-gray-100">
                      <DropdownMenuItem onClick={() => openEditDialog(doc)} className="cursor-pointer">
                        <Pencil className="w-4 h-4 mr-2 text-gray-400" /> Edit
                      </DropdownMenuItem>
                      {doc.is_active ? (
                        <DropdownMenuItem onClick={() => handleDelete(doc)} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                          <Trash2 className="w-4 h-4 mr-2" /> Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleActivate(doc)} className="cursor-pointer text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50">
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Reactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{doc.email}</span>
                  </div>
                  {doc.qualification && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{doc.qualification}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {doc.experience_years > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" /> {doc.experience_years} yrs
                      </span>
                    )}
                    {doc.consultation_fee > 0 && (
                      <span className="flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-gray-400" /> {doc.consultation_fee}
                      </span>
                    )}
                  </div>
                </div>

                {/* Specialties */}
                {doc.specialties && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {doc.specialties.split(", ").map((s, i) => (
                      <Badge key={i} className="bg-blue-50 text-blue-600 border-blue-100 shadow-none text-[10px] font-semibold hover:bg-blue-50 rounded-md px-2">{s}</Badge>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  {!doc.first_login_completed ? (
                    <Badge className="bg-amber-50 text-amber-600 border-amber-200 shadow-none text-[10px] uppercase font-bold tracking-wider hover:bg-amber-50">
                      <Key className="w-3 h-3 mr-1" /> Pending Setup
                    </Badge>
                  ) : doc.is_available ? (
                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 shadow-none text-[10px] uppercase font-bold tracking-wider hover:bg-emerald-50">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Available
                    </Badge>
                  ) : (
                    <Badge className="bg-red-50 text-red-600 border-red-200 shadow-none text-[10px] uppercase font-bold tracking-wider hover:bg-red-50">
                      <XCircle className="w-3 h-3 mr-1" /> Unavailable
                    </Badge>
                  )}
                  <span className="text-xs text-gray-400">⭐ {Number(doc.rating || 0).toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {editingDoctor ? "Edit Doctor" : "Add New Doctor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">First Name *</label>
                <Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="John" className="h-10 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Last Name *</label>
                <Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Smith" className="h-10 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email *</label>
              <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="doctor@hospital.com" className="h-10 rounded-xl" disabled={!!editingDoctor} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone</label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" className="h-10 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">License Number</label>
                <Input value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} placeholder="MCI-XXXX" className="h-10 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Department</label>
              <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
                <SelectTrigger className="h-10 w-full rounded-xl border-gray-200">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Qualification</label>
              <Input value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} placeholder="MBBS, MD" className="h-10 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Experience (Years)</label>
                <Input type="number" value={form.experienceYears} onChange={e => setForm({ ...form, experienceYears: e.target.value })} placeholder="5" className="h-10 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Consultation Fee (₹)</label>
                <Input type="number" value={form.consultationFee} onChange={e => setForm({ ...form, consultationFee: e.target.value })} placeholder="500" className="h-10 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Bio</label>
              <textarea
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                placeholder="Brief professional biography..."
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[70px] resize-none"
              />
            </div>
            {!editingDoctor && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700 font-medium flex items-center gap-2">
                  <Key className="w-3.5 h-3.5" />
                  A temporary password will be auto-generated. Share it securely with the doctor.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <DialogClose className="rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
              Cancel
            </DialogClose>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-[#10b981] hover:bg-[#059669] rounded-xl shadow-lg shadow-emerald-500/20">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingDoctor ? "Save Changes" : "Create Doctor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={credDialogOpen} onOpenChange={setCredDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Doctor Account Created
            </DialogTitle>
          </DialogHeader>
          {credentials && (
            <div className="space-y-4 py-2">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Login Email</label>
                  <div className="flex items-center justify-between mt-1">
                    <code className="text-sm font-semibold text-gray-900">{credentials.email}</code>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => copyToClipboard(credentials.email)}>
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Temporary Password</label>
                  <div className="flex items-center justify-between mt-1">
                    <code className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{credentials.tempPassword}</code>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => copyToClipboard(credentials.tempPassword)}>
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Login URL</label>
                  <div className="flex items-center justify-between mt-1">
                    <code className="text-sm text-blue-600">{typeof window !== 'undefined' ? window.location.origin : ''}/login</code>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => copyToClipboard(`${typeof window !== 'undefined' ? window.location.origin : ''}/login`)}>
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs text-red-700 font-medium">
                  ⚠️ This is the only time the temporary password will be shown. Please share it securely with the doctor. They will be required to set a new password on first login.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredDialogOpen(false)} className="rounded-xl w-full">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
