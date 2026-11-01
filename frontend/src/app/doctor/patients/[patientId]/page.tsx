"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePatientStore } from "@/store/usePatientStore";
import api from "@/lib/api";
import { ArrowLeft, Phone, Mail, MapPin, Activity, FileText, Calendar, Clock, Download, Plus, CheckCircle2, Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


export default function PatientDetailsPage() {
  const { patientId } = useParams();
  const router = useRouter();
  const { 
    patientDetails, history, reports, notes, isLoadingDetails,
    fetchPatientDetails, fetchPatientHistory, fetchPatientReports, fetchPatientNotes,
    updatePatientStatus, addPatientNote, deletePatientNote
  } = usePatientStore();

  const [activeTab, setActiveTab] = useState("overview");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isDeletingNoteId, setIsDeletingNoteId] = useState<number | null>(null);
  const [selectedReportUrl, setSelectedReportUrl] = useState<string | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      fetchPatientDetails(patientId as string);
      fetchPatientHistory(patientId as string);
      fetchPatientReports(patientId as string);
      fetchPatientNotes(patientId as string);
    }
  }, [patientId, fetchPatientDetails, fetchPatientHistory, fetchPatientReports, fetchPatientNotes]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      await updatePatientStatus(patientId as string, newStatus);
      toast.success(`Patient status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setIsAddingNote(true);
      await addPatientNote(patientId as string, newNote);
      setNewNote("");
      toast.success("Note added successfully");
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      setIsDeletingNoteId(noteId);
      await deletePatientNote(patientId as string, noteId);
      toast.success("Note deleted successfully");
    } catch (error) {
      toast.error("Failed to delete note");
    } finally {
      setIsDeletingNoteId(null);
    }
  };

  const handleDownloadReport = async (reportId: number, fileName: string) => {
    try {
      toast.info("Preparing download...");
      const res: any = await api.get(`/reports/${reportId}/download`);
      if (res.data?.url) {
        const response = await fetch(res.data.url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName || `report_${reportId}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      } else {
        toast.error("Could not get download URL");
      }
    } catch (error) {
      toast.error("Error downloading report");
    }
  };

  const handlePreviewReport = async (reportId: number, fileType: string) => {
    try {
      const res: any = await api.get(`/reports/${reportId}/download`);
      if (res.data?.url) {
        setSelectedReportUrl(res.data.url);
        setSelectedReportType(fileType);
      } else {
        toast.error("Could not load preview");
      }
    } catch (error) {
      toast.error("Error loading preview");
    }
  };



  if (isLoadingDetails) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 w-24 bg-muted rounded"></div>
        <div className="h-48 bg-muted rounded-xl"></div>
        <div className="flex gap-4 border-b pb-2">
          <div className="h-8 w-24 bg-muted rounded"></div>
          <div className="h-8 w-24 bg-muted rounded"></div>
          <div className="h-8 w-24 bg-muted rounded"></div>
        </div>
        <div className="h-64 bg-muted rounded-xl"></div>
      </div>
    );
  }

  if (!patientDetails) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <h3 className="text-xl font-semibold text-foreground">Patient Not Found</h3>
        <p className="mt-2 text-sm">The patient profile could not be loaded or doesn't exist.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-700 border-green-200";
      case "Under Treatment": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Critical": return "bg-red-100 text-red-700 border-red-200";
      case "Recovered": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/doctor/patients" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Details</h1>
          <p className="text-muted-foreground text-sm">View and manage complete medical records</p>
        </div>
      </div>

      {/* Profile Summary Card */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/10 flex-shrink-0 border-4 border-background shadow-sm">
            {patientDetails.avatar_url ? (
              <img src={patientDetails.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary font-bold text-3xl">
                {patientDetails.first_name[0]}{patientDetails.last_name[0]}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {patientDetails.first_name} {patientDetails.last_name}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{patientDetails.gender ? patientDetails.gender.charAt(0).toUpperCase() + patientDetails.gender.slice(1) : "N/A"}</span>
              <span>•</span>
              <span>{patientDetails.date_of_birth ? `${new Date().getFullYear() - new Date(patientDetails.date_of_birth).getFullYear()} yrs` : "N/A"}</span>
              <span>•</span>
              <span className="font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                {patientDetails.blood_group || "Unknown"} Blood
              </span>
            </div>
            
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" /> {patientDetails.phone || "N/A"}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" /> {patientDetails.email}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 p-4 rounded-xl border flex flex-col gap-2 min-w-[200px]">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Status</span>
          <select 
            className={`w-full appearance-none px-3 py-2 text-sm font-medium border rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 ${getStatusColor(patientDetails.status)}`}
            value={patientDetails.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isUpdatingStatus}
          >
            <option value="Active">Active</option>
            <option value="Under Treatment">Under Treatment</option>
            <option value="Critical">Critical</option>
            <option value="Recovered">Recovered</option>
          </select>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="flex overflow-x-auto border-b hide-scrollbar">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "history", label: "Consultation History", icon: Calendar },
          { id: "reports", label: "Uploaded Reports", icon: FileText },
          { id: "notes", label: "Doctor Notes", icon: Clock },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap
              ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
            `}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md"></span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> Contact & Address
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Address</div>
                  <div className="font-medium mt-1">{patientDetails.address_line1 || "Not provided"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">City</div>
                  <div className="font-medium mt-1">{patientDetails.city || "Not provided"}</div>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Medical Profile Preview
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  View complete medical details and history submitted by the patient.
                </p>
                {patientDetails.allergies ? (
                  <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 p-4 rounded-lg text-sm">
                    <span className="font-semibold block mb-1">Allergies</span>
                    {patientDetails.allergies}
                  </div>
                ) : (
                  <div className="bg-muted text-muted-foreground border p-4 rounded-lg text-sm">
                    No allergies recorded.
                  </div>
                )}
                {patientDetails.medical_history ? (
                  <div className="bg-blue-50 text-blue-800 border border-blue-200 p-4 rounded-lg text-sm">
                    <span className="font-semibold block mb-1">Medical History</span>
                    {patientDetails.medical_history}
                  </div>
                ) : (
                  <div className="bg-muted text-muted-foreground border p-4 rounded-lg text-sm">
                    No medical history recorded.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b">
              <h3 className="font-semibold text-lg">Consultation History</h3>
              <p className="text-sm text-muted-foreground">Past and upcoming appointments with you.</p>
            </div>
            {history.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No appointments found for this patient.</p>
              </div>
            ) : (
              <div className="divide-y">
                {history.map((appt) => (
                  <div key={appt.id} className="p-6 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        {format(new Date(appt.appointment_date), "MMMM d, yyyy")}
                        <span className="text-muted-foreground font-normal">•</span>
                        <span>{appt.start_time.substring(0,5)} - {appt.end_time.substring(0,5)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 capitalize">
                        {appt.consultation_type.replace('_', ' ')} • {appt.reason || 'No specific reason'}
                      </div>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: `${appt.status_color}20`, color: appt.status_color, border: `1px solid ${appt.status_color}40` }}>
                      {appt.status_name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-card border rounded-xl p-6 shadow-sm">
              <div>
                <h3 className="font-semibold text-lg">Medical Reports</h3>
                <p className="text-sm text-muted-foreground">Reports uploaded by patient and shared with you.</p>
              </div>
            </div>
            
            {reports.length === 0 ? (
              <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground shadow-sm">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No reports have been shared with you.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report) => (
                  <div key={report.id} className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-primary/10 text-primary rounded-lg">
                        <FileText className="h-6 w-6" />
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {report.file_type.split('/')[1] || report.file_type}
                      </span>
                    </div>
                    <h4 className="font-medium text-foreground line-clamp-1" title={report.title}>{report.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      Uploaded on {format(new Date(report.created_at), "MMM d, yyyy")}<br/>
                      By: {report.uploader_role === 'doctor' 
                            ? `Dr. ${report.uploaded_by_name} ${report.uploaded_by_last_name || ''}` 
                            : report.uploaded_by_name 
                              ? `${report.uploaded_by_name} ${report.uploaded_by_last_name || ''}` 
                              : "Patient"}
                    </p>
                    <div className="flex gap-2">
                      
                      <Dialog>
                        <DialogTrigger onClick={() => handlePreviewReport(report.id, report.file_type)} className="flex-1 flex items-center justify-center gap-1 bg-muted hover:bg-muted/80 text-foreground py-2 rounded-md text-xs font-medium transition-colors">
                          <Eye className="h-3.5 w-3.5" /> Preview
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                          <DialogHeader>
                            <DialogTitle>{report.title}</DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 bg-muted/30 rounded-md overflow-hidden mt-4 relative flex items-center justify-center p-2">
                            {selectedReportUrl ? (
                              selectedReportType?.startsWith('image/') || selectedReportUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                <img src={selectedReportUrl} className="max-w-full max-h-full object-contain" alt="Report preview" />
                              ) : (
                                <iframe src={selectedReportUrl} className="w-full h-full border-0" />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading preview...</div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <button onClick={() => handleDownloadReport(report.id, report.file_name || report.title)} className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground hover:bg-primary/90 py-2 rounded-md text-xs font-medium transition-colors">
                        <Download className="h-3.5 w-3.5" /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === "notes" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card border rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" /> Add New Note
                </h3>
                <form onSubmit={handleAddNote}>
                  <textarea
                    placeholder="Type your clinical notes here..."
                    className="w-full min-h-[200px] border rounded-lg p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y bg-background"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    required
                  ></textarea>
                  <button 
                    type="submit" 
                    disabled={isAddingNote || !newNote.trim()}
                    className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md font-medium transition-colors disabled:opacity-50"
                  >
                    {isAddingNote ? "Saving..." : "Save Note"}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold text-lg mb-4 text-foreground/80">Previous Notes</h3>
              {notes.length === 0 ? (
                <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground shadow-sm">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>You haven't added any notes for this patient yet.</p>
                </div>
              ) : (
                notes.map(note => (
                  <div key={note.id} className="bg-card border rounded-xl p-6 shadow-sm relative group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                      <button 
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={isDeletingNoteId === note.id}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all disabled:opacity-50"
                        title="Delete note"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {note.note}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
