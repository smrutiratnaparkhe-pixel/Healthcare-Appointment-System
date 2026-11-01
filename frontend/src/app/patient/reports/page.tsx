"use client";

import { useEffect, useState, useRef } from "react";
import { useReportStore } from "@/store/useReportStore";
import { 
  FileText, UploadCloud, Search, Download, Trash2, 
  Activity, Pill, FileBox, Beaker, FileImage, ShieldCheck,
  ChevronRight, Calendar, AlertCircle, Share2, Plus, 
  X, CheckCircle2, Clock, Upload
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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

export default function PatientReports() {
  const { 
    reports, activeShares, isLoading, isUploading, 
    fetchMyReports, uploadReport, downloadReport, deleteReport, 
    shareReport, fetchReportShares, revokeReportShare 
  } = useReportStore();
  
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    reportType: "other",
    reportDate: new Date().toISOString().split('T')[0],
    description: "",
    sharedDoctorIds: [] as string[]
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [shareForm, setShareForm] = useState({
    doctorId: "",
    accessType: "view",
    expiresInDays: 30
  });
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    fetchMyReports();
    const fetchDoctors = async () => {
      try {
        const res: any = await api.get('/doctors?limit=100');
        setDoctors(res.data.data || res.data || []);
      } catch (err) {
        console.error("Failed to fetch doctors", err);
      }
    };
    fetchDoctors();
  }, [fetchMyReports]);

  useEffect(() => {
    if (shareModalOpen && selectedReportId) {
      fetchReportShares(selectedReportId);
    }
  }, [shareModalOpen, selectedReportId, fetchReportShares]);

  const handleShare = async () => {
    if (!selectedReportId || !shareForm.doctorId) {
      toast.error("Please select a doctor to share with");
      return;
    }
    try {
      setIsSharing(true);
      await shareReport(selectedReportId, Number(shareForm.doctorId), shareForm.accessType, Number(shareForm.expiresInDays));
      toast.success("Report shared successfully");
      setShareModalOpen(false);
      setShareForm({ doctorId: "", accessType: "view", expiresInDays: 30 });
    } catch (err: any) {
      toast.error(err.message || "Failed to share report");
    } finally {
      setIsSharing(false);
    }
  };

  // Derived state
  const filteredReports = reports.filter(r => {
    const matchesCategory = activeCategory === 'all' || r.report_type === activeCategory;
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (r.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const availableDoctors = doctors.filter(d => 
    !activeShares?.some(share => share.doctor_id === d.id)
  );

  const getCategoryDetails = (type: string) => {
    const cat = CATEGORIES.find(c => c.id === type) || CATEGORIES[6];
    return cat;
  };

  const getIconColor = (type: string) => {
    switch(type) {
      case 'prescription': return 'text-purple-500 bg-purple-50';
      case 'lab_result': return 'text-blue-500 bg-blue-50';
      case 'imaging': return 'text-amber-500 bg-amber-50';
      case 'discharge_summary': return 'text-[#10b981] bg-[#10b981]/10';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Upload Handlers
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
    if (!file) return;
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('title', formData.title);
      data.append('reportType', formData.reportType);
      data.append('reportDate', formData.reportDate);
      data.append('description', formData.description);
      if (formData.sharedDoctorIds && formData.sharedDoctorIds.length > 0) {
        data.append('sharedDoctorIds', JSON.stringify(formData.sharedDoctorIds.map(Number)));
      }

      await uploadReport(data);
      setUploadModalOpen(false);
      setFile(null);
      setFormData({ title: "", reportType: "other", reportDate: new Date().toISOString().split('T')[0], description: "", sharedDoctorIds: [] });
    } catch (error: any) {
      console.error("Upload Error:", error.message || error);
    }
  };

  const triggerDelete = async () => {
    if (!selectedReportId) return;
    setIsDeleting(true);
    try {
      await deleteReport(selectedReportId);
      setDeleteModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Medical Records</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Securely view, upload, and manage your health documents.</p>
        </div>
        
        <Button 
          onClick={() => setUploadModalOpen(true)}
          className="bg-[#10b981] hover:bg-[#059669] text-white shadow-lg shadow-emerald-500/25 rounded-xl h-11 px-6 font-semibold transition-all hover:scale-105 active:scale-95 flex items-center shrink-0"
        >
          <UploadCloud className="w-5 h-5 mr-2" />
          Upload Report
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col justify-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Records</p>
          <div className="text-2xl font-black text-gray-900">{isLoading ? <Skeleton className="w-10 h-8" /> : reports.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col justify-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Recent Uploads</p>
          <div className="text-2xl font-black text-[#10b981]">{isLoading ? <Skeleton className="w-10 h-8" /> : reports.filter(r => new Date(r.created_at) > new Date(Date.now() - 7*24*60*60*1000)).length}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col justify-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Prescriptions</p>
          <div className="text-2xl font-black text-purple-600">{isLoading ? <Skeleton className="w-10 h-8" /> : reports.filter(r => r.report_type === 'prescription').length}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col justify-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Lab Reports</p>
          <div className="text-2xl font-black text-blue-600">{isLoading ? <Skeleton className="w-10 h-8" /> : reports.filter(r => r.report_type === 'lab_result').length}</div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] overflow-hidden">
        
        {/* Toolbar */}
        <div className="border-b border-gray-100 p-4 sm:p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-gray-50/30">
          
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl transition-all border ${
                    isActive 
                      ? 'bg-white border-[#10b981] text-[#10b981] shadow-sm' 
                      : 'bg-white/50 border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#10b981]' : 'text-gray-400'}`} />
                  {cat.label}
                </button>
              )
            })}
          </div>

          <div className="relative w-full xl:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search reports..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all bg-white"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100 shadow-inner">
                <FileBox className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Reports Found</h3>
              <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto mb-8">
                {searchQuery || activeCategory !== 'all' 
                  ? "We couldn't find any documents matching your current filters." 
                  : "You haven't uploaded any medical records yet. Keep all your health data securely in one place."}
              </p>
              {!(searchQuery || activeCategory !== 'all') && (
                <Button 
                  onClick={() => setUploadModalOpen(true)}
                  className="bg-white border-2 border-[#10b981] text-[#10b981] hover:bg-[#10b981]/5 font-bold rounded-xl h-11 px-8 shadow-sm"
                >
                  <UploadCloud className="w-5 h-5 mr-2" />
                  Upload First Report
                </Button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredReports.map((report) => {
                const catDetails = getCategoryDetails(report.report_type);
                const Icon = catDetails.icon;
                const iconColorClass = getIconColor(report.report_type);
                
                return (
                  <Card key={report.id} className="group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 border-gray-100 rounded-2xl overflow-hidden bg-white">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColorClass}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <Badge variant="outline" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-gray-200 px-2 py-0.5 shadow-none">
                            {formatFileSize(report.file_size)}
                          </Badge>
                          {report.shared_count > 0 && (
                            <Badge className="text-[9px] font-bold bg-blue-50 text-blue-600 border-blue-100 uppercase tracking-wider px-2 py-0 shadow-none flex items-center gap-1">
                              <Share2 className="w-2.5 h-2.5" /> Shared ({report.shared_count})
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <h3 className="text-base font-bold text-gray-900 line-clamp-1 mb-1 group-hover:text-[#10b981] transition-colors" title={report.title}>
                        {report.title}
                      </h3>
                      
                      <div className="flex items-center text-xs font-semibold text-gray-500 mb-4 gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(parseISO(report.report_date.split('T')[0]), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" />
                          {catDetails.label}
                        </span>
                      </div>

                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-xs font-medium text-gray-400">
                          By: <span className="font-semibold text-gray-600">{report.uploaded_by_name}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => downloadReport(report.id, report.file_name)}
                            className="h-8 w-8 text-[#10b981] hover:bg-[#10b981]/10 hover:text-[#059669] rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => { setSelectedReportId(report.id); setShareModalOpen(true); }}
                            className="h-8 w-8 text-blue-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                            title="Share with Doctor"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => { setSelectedReportId(report.id); setDeleteModalOpen(true); }}
                            className="h-8 w-8 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
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
                  Add a new medical document to your secure health vault.
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
                    placeholder="Add any context for your doctor..." 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-[#10b981] focus:ring-[#10b981]/20"
                  />
                </div>
                
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Share with Doctors (Optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {doctors.map(doc => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          if (formData.sharedDoctorIds.includes(doc.id.toString())) {
                            setFormData({...formData, sharedDoctorIds: formData.sharedDoctorIds.filter(id => id !== doc.id.toString())});
                          } else {
                            setFormData({...formData, sharedDoctorIds: [...formData.sharedDoctorIds, doc.id.toString()]});
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2 ${formData.sharedDoctorIds.includes(doc.id.toString()) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                      >
                        {formData.sharedDoctorIds.includes(doc.id.toString()) && <CheckCircle2 className="w-3.5 h-3.5" />}
                        Dr. {doc.first_name} {doc.last_name}
                      </button>
                    ))}
                  </div>
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
                disabled={!file || !formData.title || isUploading}
                className="bg-[#10b981] hover:bg-[#059669] text-white font-semibold rounded-xl h-11 px-8 shadow-lg shadow-emerald-500/25"
              >
                {isUploading ? "Uploading..." : "Save Report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-[24px]">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-100">
              <AlertCircle className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 mb-2">Delete Report?</DialogTitle>
            <DialogDescription className="text-gray-500 mb-8 font-medium">
              Are you sure you want to permanently delete this medical report? This action cannot be undone.
            </DialogDescription>
            
            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 border-gray-200 text-gray-700 font-semibold rounded-xl h-11 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={triggerDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl h-11 shadow-lg shadow-red-500/20"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Share Modal */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl rounded-[24px]">
          <DialogHeader className="px-2 pt-4 pb-0">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Share2 className="w-5 h-5 text-blue-500" />
              </div>
              Share Report
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-medium">
              Grant a doctor access to view or manage this medical report.
            </DialogDescription>
          </DialogHeader>

          <div className="p-2 space-y-5 mt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Select Doctor <span className="text-red-500">*</span></Label>
              <select
                value={shareForm.doctorId}
                onChange={(e) => setShareForm({...shareForm, doctorId: e.target.value})}
                className="w-full h-11 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all bg-white"
              >
                <option value="">-- Choose a Doctor --</option>
                {availableDoctors.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.first_name} {d.last_name} {d.specialties ? `(${d.specialties})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Access Level</Label>
                <select
                  value={shareForm.accessType}
                  onChange={(e) => setShareForm({...shareForm, accessType: e.target.value})}
                  className="w-full h-11 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all bg-white"
                >
                  <option value="view">Read Only</option>
                  <option value="download">Read & Write</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Expires in (Days)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={shareForm.expiresInDays}
                  onChange={(e) => setShareForm({...shareForm, expiresInDays: parseInt(e.target.value) || 30})}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button 
                variant="outline" 
                onClick={() => setShareModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleShare}
                disabled={!shareForm.doctorId || isSharing}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/25"
              >
                {isSharing ? "Sharing..." : "Share Report"}
              </Button>
            </div>
            
            {activeShares && activeShares.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Currently Shared With
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {activeShares.map((share) => (
                    <div key={share.access_id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Dr. {share.doctor_first_name} {share.doctor_last_name}</p>
                        <p className="text-[11px] text-gray-500">Shared on {format(new Date(share.created_at), 'MMM d, yyyy')}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={async () => {
                          try {
                            await revokeReportShare(share.access_id, selectedReportId!);
                            toast.success("Access revoked");
                          } catch (err) {
                            toast.error("Failed to revoke access");
                          }
                        }}
                        className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold"
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
