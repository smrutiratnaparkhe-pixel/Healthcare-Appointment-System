"use client";

import { useEffect, useState, useRef } from "react";
import { usePatientStore } from "@/store/usePatientStore";
import { Search, Filter, MoreVertical, Eye, Calendar, UserPlus, UploadCloud, CheckCircle2, Upload, FileBox, Pill, Beaker, FileImage, FileText, Activity } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { toast } from "sonner";

const CATEGORIES = [
  { id: 'all', label: 'All Reports', icon: FileBox },
  { id: 'prescription', label: 'Prescriptions', icon: Pill },
  { id: 'lab_result', label: 'Lab Reports', icon: Beaker },
  { id: 'imaging', label: 'Scans & X-Rays', icon: FileImage },
  { id: 'discharge_summary', label: 'Discharge Summaries', icon: FileText },
  { id: 'other', label: 'Other', icon: Activity },
];

export default function PatientsPage() {
  const { patients, isLoading, fetchPatients } = usePatientStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    reportType: "other",
    reportDate: new Date().toISOString().split('T')[0],
    description: "",
    patientId: ""
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(1, 20, searchTerm, statusFilter);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, fetchPatients]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-700 border-green-200";
      case "Under Treatment": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Critical": return "bg-red-100 text-red-700 border-red-200";
      case "Recovered": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    if (!formData.title) {
      setFormData(prev => ({ ...prev, title: selectedFile.name.split('.')[0] }));
    }
  };

  const submitUpload = async () => {
    if (!file) return toast.error("Please select a file to upload");
    if (!formData.title.trim()) return toast.error("Please provide a title");
    if (!formData.patientId) return toast.error("Please select a patient");

    try {
      setIsUploading(true);
      const data = new FormData();
      data.append('file', file);
      data.append('title', formData.title);
      data.append('reportType', formData.reportType);
      data.append('reportDate', formData.reportDate);
      data.append('description', formData.description);
      data.append('patientId', formData.patientId);

      await api.post('/reports/upload', data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      toast.success("Report uploaded successfully");
      setUploadModalOpen(false);
      setFile(null);
      setFormData({ title: "", reportType: "other", reportDate: new Date().toISOString().split('T')[0], description: "", patientId: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to upload report");
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Records</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your patients, view medical history, and add consultation notes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => setUploadModalOpen(true)}
            className="bg-[#10b981] hover:bg-[#059669] text-white shadow-sm rounded-md h-10 px-4 font-medium transition-all flex items-center shrink-0 w-full sm:w-auto"
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            Upload Report
          </Button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background appearance-none pr-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Under Treatment">Under Treatment</option>
              <option value="Critical">Critical</option>
              <option value="Recovered">Recovered</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Recent Patients Cards (Mocked or just first 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {!isLoading && patients.slice(0, 4).map((patient) => (
          <div key={`card-${patient.id}`} className="bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">
                  {patient.avatar_url ? (
                    <img src={patient.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary font-medium text-lg">
                      {patient.first_name[0]}{patient.last_name[0]}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-sm line-clamp-1">{patient.first_name} {patient.last_name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getStatusColor(patient.status)}`}>
                    {patient.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {patient.last_visit ? format(new Date(patient.last_visit), "MMM d, yyyy") : "No visits yet"}
              </div>
              <Link href={`/doctor/patients/${patient.id}`} className="text-primary hover:underline font-medium">
                View Profile
              </Link>
            </div>
          </div>
        ))}
        {isLoading && Array(4).fill(0).map((_, i) => (
          <div key={i} className="bg-card border rounded-xl p-4 shadow-sm animate-pulse h-[130px]">
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-full bg-muted"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-3 bg-muted rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Patient Records Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Patient Info</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Blood Group</th>
                <th className="px-6 py-4 font-medium">Last Visit</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 w-48 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-8 w-32 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-6 w-12 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-6 w-24 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-muted rounded-full"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 w-8 bg-muted rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <UserPlus className="h-12 w-12 mb-4 opacity-20" />
                      <h3 className="text-lg font-medium text-foreground">No patients found</h3>
                      <p className="text-sm mt-1">Try adjusting your search or filter parameters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">
                          {patient.avatar_url ? (
                            <img src={patient.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary font-medium">
                              {patient.first_name[0]}{patient.last_name[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {patient.first_name} {patient.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : "N/A"} • 
                            {patient.date_of_birth ? ` ${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} yrs` : " N/A"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{patient.phone || "No phone"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{patient.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {patient.blood_group ? (
                        <span className="font-medium text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100">
                          {patient.blood_group}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {patient.last_visit ? (
                        <div className="text-sm">{format(new Date(patient.last_visit), "MMM d, yyyy")}</div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getStatusColor(patient.status)}`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 hover:bg-muted rounded-md transition-all">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="p-0">
                            <Link href={`/doctor/patients/${patient.id}`} className="cursor-pointer flex items-center gap-2 w-full h-full px-2 py-1.5">
                              <Eye className="h-4 w-4" />
                              View Full Profile
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-[24px]">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">Upload Report</DialogTitle>
                <DialogDescription className="text-sm font-medium text-gray-500 mt-1">
                  Add a new medical document to a patient's record.
                </DialogDescription>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-[#10b981] rounded-2xl flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-5">
              {/* Drag and Drop Zone */}
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  dragActive ? 'border-[#10b981] bg-[#10b981]/5' : 
                  file ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 hover:border-[#10b981]/50 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf,.jpg,.jpeg,.png,.dicom" 
                  onChange={(e) => e.target.files && handleFileSelection(e.target.files[0])}
                />
                
                {file ? (
                  <div className="flex flex-col items-center justify-center animate-in zoom-in duration-300">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-emerald-100 flex items-center justify-center mb-3 text-[#10b981]">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-gray-900">{file.name}</p>
                    <p className="text-xs font-semibold text-gray-500 mt-1">{formatFileSize(file.size)}</p>
                    <p className="text-xs text-[#10b981] font-bold mt-4 cursor-pointer hover:underline">Click to change file</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center cursor-pointer">
                    <Upload className={`w-10 h-10 mb-4 ${dragActive ? 'text-[#10b981] animate-bounce' : 'text-gray-400'}`} />
                    <p className="text-sm font-bold text-gray-900">Drag & drop your file here</p>
                    <p className="text-xs font-medium text-gray-500 mt-1">or click to browse from your computer</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-4">Supported: PDF, JPG, PNG (Max 10MB)</p>
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Select Patient *</Label>
                  <select 
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all"
                    value={formData.patientId}
                    onChange={e => setFormData({...formData, patientId: e.target.value})}
                  >
                    <option value="">-- Choose a Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Report Title *</Label>
                  <Input 
                    placeholder="e.g. Blood Test Results" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-[#10b981] focus:ring-[#10b981]/20"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Category *</Label>
                  <select 
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all"
                    value={formData.reportType}
                    onChange={e => setFormData({...formData, reportType: e.target.value})}
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Report Date</Label>
                  <Input 
                    type="date"
                    value={formData.reportDate} 
                    onChange={e => setFormData({...formData, reportDate: e.target.value})}
                    className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-[#10b981] focus:ring-[#10b981]/20"
                  />
                </div>
                
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Notes (Optional)</Label>
                  <Input 
                    placeholder="Add any context for the patient..." 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-[#10b981] focus:ring-[#10b981]/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button 
                variant="outline" 
                onClick={() => setUploadModalOpen(false)}
                className="border-gray-200 text-gray-700 font-semibold rounded-xl h-11 px-6 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={submitUpload}
                disabled={!file || !formData.title || !formData.patientId || isUploading}
                className="bg-[#10b981] hover:bg-[#059669] text-white font-semibold rounded-xl h-11 px-8 shadow-lg shadow-emerald-500/25"
              >
                {isUploading ? "Uploading..." : "Save Report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
