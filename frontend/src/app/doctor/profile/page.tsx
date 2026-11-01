"use client";

import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/useProfileStore";
import { 
  User, Briefcase, Clock, Shield, Bell, FileText, 
  Upload, Trash2, LogOut, CheckCircle2, AlertTriangle, Eye, EyeOff, Save, Plus
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import api from "@/lib/api";

const TABS = [
  { id: 'personal', label: 'Personal Information', icon: User },
  { id: 'professional', label: 'Professional Details', icon: Briefcase },
  { id: 'availability', label: 'Availability & Leaves', icon: Clock },
  { id: 'security', label: 'Security & Login', icon: Shield },
  { id: 'notifications', label: 'Notification Preferences', icon: Bell },
  { id: 'documents', label: 'Document Management', icon: FileText },
];

export default function ProfileSettingsPage() {
  const { user, checkAuth, logout } = useAuthStore();
  const { 
    documents, leaves, sessions, activityLogs, notificationPreferences,
    fetchDocuments, uploadDocument, deleteDocument,
    fetchLeaves, applyLeave, cancelLeave,
    fetchSessions, revokeSession, fetchActivityLogs,
    fetchNotificationPreferences, updateNotificationPreferences,
    updatePersonalProfile, updateProfessionalProfile, updateAvailability
  } = useProfileStore();

  const [activeTab, setActiveTab] = useState('personal');
  const [isSaving, setIsSaving] = useState(false);
  
  // Personal Info Form State
  const [personalForm, setPersonalForm] = useState({
    firstName: '', lastName: '', phone: '', gender: '', dateOfBirth: '', addressLine1: '', city: '', avatarUrl: ''
  });
  
  // Professional Info Form State
  const [profForm, setProfForm] = useState({
    qualification: '', experienceYears: 0, consultationFee: 0, bio: ''
  });

  // Security Form State
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);

  // Leave Form State
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });

  // Notifications Form State
  const [notifForm, setNotifForm] = useState({
    appointment_alerts: true, emergency_alerts: true, email_notifications: true, sms_notifications: false
  });

  // Documents
  const [docType, setDocType] = useState('certificate');
  const [docFile, setDocFile] = useState<File | null>(null);

  // Availability
  const [isAvailable, setIsAvailable] = useState(false);
  const [emergencyAvailable, setEmergencyAvailable] = useState(false);

  useEffect(() => {
    // Initial fetch of data when tabs load
    fetchDocuments();
    fetchLeaves();
    fetchSessions();
    fetchActivityLogs();
    fetchNotificationPreferences();
    if (user) {
      setPersonalForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        gender: user.gender || '',
        dateOfBirth: user.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '',
        addressLine1: user.address_line1 || '',
        city: user.city || '',
        avatarUrl: user.avatar || ''
      });
      if (user.doctor) {
        setProfForm({
          qualification: user.doctor.qualification || '',
          experienceYears: user.doctor.experience_years || 0,
          consultationFee: user.doctor.consultation_fee || 0,
          bio: user.doctor.bio || ''
        });
        setIsAvailable(user.doctor.is_available);
        setEmergencyAvailable(user.doctor.emergency_availability);
      }
    }
  }, [user]);

  useEffect(() => {
    if (notificationPreferences) {
      setNotifForm(notificationPreferences);
    }
  }, [notificationPreferences]);

  // Handlers
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updatePersonalProfile(personalForm);
      await checkAuth();
      toast.success("Personal information updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.doctor?.id) return;
    try {
      setIsSaving(true);
      await updateProfessionalProfile(user.doctor.id, profForm);
      await checkAuth();
      toast.success("Professional details updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update professional details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    try {
      setIsSaving(true);
      await api.put('/auth/change-password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword
      });
      toast.success("Password changed successfully");
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await fetchSessions(); // Tokens might be revoked
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAvailability = async () => {
    try {
      setIsSaving(true);
      await updateAvailability(isAvailable, emergencyAvailable);
      await checkAuth();
      toast.success("Availability updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update availability");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await applyLeave(leaveForm.startDate, leaveForm.endDate, leaveForm.reason);
      toast.success("Leave applied successfully");
      setLeaveForm({ startDate: '', endDate: '', reason: '' });
    } catch (err: any) {
      toast.error(err.message || "Failed to apply for leave");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateNotificationPreferences(notifForm);
      toast.success("Notification preferences saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return toast.error("Please select a file");
    try {
      setIsSaving(true);
      await uploadDocument(docFile, docType);
      toast.success("Document uploaded successfully");
      setDocFile(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await api.post('/auth/logout');
      toast.success("Logged out from all devices");
      logout();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your personal and professional profile, preferences, and security.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium">Profile Completion</div>
          <div className="w-32 h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="bg-primary h-full w-[85%] rounded-full"></div>
          </div>
          <span className="text-xs text-muted-foreground font-medium">85%</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6 min-w-0">
          
          {/* PERSONAL INFO */}
          {activeTab === 'personal' && (
            <div className="bg-card border rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-lg font-semibold mb-6">Personal Information</h2>
              
              <div className="flex items-center gap-6 mb-8 pb-8 border-b">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl overflow-hidden border-2 border-background shadow-sm">
                  {personalForm.avatarUrl ? <img src={personalForm.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : user?.firstName?.[0]}
                </div>
                <div>
                  <input type="file" id="avatarUpload" className="hidden" accept="image/*" onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        setIsSaving(true);
                        await api.post('/auth/avatar', formData);
                        await checkAuth();
                        setPersonalForm({...personalForm, avatarUrl: URL.createObjectURL(file)});
                        toast.success("Avatar updated");
                      } catch (err: any) {
                        toast.error(err.message || "Failed to update avatar");
                      } finally {
                        setIsSaving(false);
                      }
                    }
                  }} />
                  <button onClick={() => document.getElementById('avatarUpload')?.click()} className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    Change Photo
                  </button>
                  <p className="text-xs text-muted-foreground mt-2">JPG, GIF or PNG. Max size of 800K</p>
                </div>
              </div>

              <form onSubmit={handleSavePersonal} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">First Name</label>
                    <input type="text" className="w-full p-2.5 text-sm border rounded-md bg-background" value={personalForm.firstName} onChange={e => setPersonalForm({...personalForm, firstName: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Last Name</label>
                    <input type="text" className="w-full p-2.5 text-sm border rounded-md bg-background" value={personalForm.lastName} onChange={e => setPersonalForm({...personalForm, lastName: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Email Address</label>
                    <input type="email" className="w-full p-2.5 text-sm border rounded-md bg-muted text-muted-foreground cursor-not-allowed" value={user?.email || ''} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Phone Number</label>
                    <input type="tel" className="w-full p-2.5 text-sm border rounded-md bg-background" value={personalForm.phone} onChange={e => setPersonalForm({...personalForm, phone: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Gender</label>
                    <select className="w-full p-2.5 text-sm border rounded-md bg-background" value={personalForm.gender} onChange={e => setPersonalForm({...personalForm, gender: e.target.value})}>
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Date of Birth</label>
                    <input type="date" className="w-full p-2.5 text-sm border rounded-md bg-background" value={personalForm.dateOfBirth} onChange={e => setPersonalForm({...personalForm, dateOfBirth: e.target.value})} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium text-foreground">Address Line 1</label>
                    <input type="text" className="w-full p-2.5 text-sm border rounded-md bg-background" value={personalForm.addressLine1} onChange={e => setPersonalForm({...personalForm, addressLine1: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">City</label>
                    <input type="text" className="w-full p-2.5 text-sm border rounded-md bg-background" value={personalForm.city} onChange={e => setPersonalForm({...personalForm, city: e.target.value})} />
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-70">
                    <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PROFESSIONAL INFO */}
          {activeTab === 'professional' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-6">Professional Details</h2>
                <form onSubmit={handleSaveProfessional} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Qualification</label>
                      <input type="text" className="w-full p-2.5 text-sm border rounded-md bg-background placeholder:text-muted-foreground" placeholder="e.g. MBBS, MD" value={profForm.qualification} onChange={e => setProfForm({...profForm, qualification: e.target.value})} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Experience (Years)</label>
                      <input type="number" min="0" className="w-full p-2.5 text-sm border rounded-md bg-background" value={profForm.experienceYears} onChange={e => setProfForm({...profForm, experienceYears: parseInt(e.target.value)})} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Department</label>
                      <input type="text" className="w-full p-2.5 text-sm border rounded-md bg-muted text-muted-foreground cursor-not-allowed" value={user?.doctor?.department_name || 'Unassigned'} disabled />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Consultation Fee ($)</label>
                      <input type="number" min="0" className="w-full p-2.5 text-sm border rounded-md bg-background" value={profForm.consultationFee} onChange={e => setProfForm({...profForm, consultationFee: parseFloat(e.target.value)})} required />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-sm font-medium text-foreground">About / Bio</label>
                      <textarea className="w-full p-2.5 text-sm border rounded-md bg-background min-h-[120px] resize-y" placeholder="Write a short bio about your practice, expertise, and approach to care..." value={profForm.bio} onChange={e => setProfForm({...profForm, bio: e.target.value})}></textarea>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-70">
                      <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Rating Snapshot */}
              <div className="bg-card border rounded-2xl p-6 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Patient Reviews</h3>
                  <p className="text-sm text-muted-foreground">Average rating across {user?.doctor?.total_reviews || 0} reviews</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-foreground">{user?.doctor?.rating || "0.0"}</div>
                  <div className="text-yellow-400 text-xl">★★★★★</div>
                </div>
              </div>
            </div>
          )}

          {/* AVAILABILITY */}
          {activeTab === 'availability' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-2">Availability Status</h2>
                <p className="text-sm text-muted-foreground mb-6">Manage your current visibility and emergency readiness.</p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-background">
                    <div>
                      <div className="font-medium text-sm">Accepting Appointments</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Toggle whether you are currently bookable.</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-background border-red-100 bg-red-50/30">
                    <div>
                      <div className="font-medium text-sm text-red-700 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Emergency Availability
                      </div>
                      <div className="text-xs text-red-600/80 mt-0.5">Indicate if you are available for on-call emergencies.</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={emergencyAvailable} onChange={e => setEmergencyAvailable(e.target.checked)} />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button onClick={handleSaveAvailability} disabled={isSaving} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium text-sm transition-colors disabled:opacity-70">
                    {isSaving ? "Saving..." : "Update Status"}
                  </button>
                </div>
              </div>

              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">Leave & Vacation Management</h2>
                    <p className="text-sm text-muted-foreground">Block out days you will be away.</p>
                  </div>
                </div>
                
                <form onSubmit={handleApplyLeave} className="flex flex-col sm:flex-row gap-4 items-end bg-muted/30 p-4 rounded-xl border mb-6">
                  <div className="w-full space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Start Date</label>
                    <input type="date" required className="w-full p-2 text-sm border rounded-md" value={leaveForm.startDate} onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})} />
                  </div>
                  <div className="w-full space-y-1.5">
                    <label className="text-xs font-medium text-foreground">End Date</label>
                    <input type="date" required className="w-full p-2 text-sm border rounded-md" value={leaveForm.endDate} onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})} />
                  </div>
                  <div className="w-full sm:w-[200%] space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Reason</label>
                    <input type="text" placeholder="e.g. Annual Leave" required className="w-full p-2 text-sm border rounded-md" value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} />
                  </div>
                  <button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground h-9 px-4 rounded-md font-medium text-sm flex items-center gap-1 flex-shrink-0">
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium rounded-tl-lg">Duration</th>
                        <th className="px-4 py-3 font-medium">Reason</th>
                        <th className="px-4 py-3 font-medium">Applied On</th>
                        <th className="px-4 py-3 font-medium rounded-tr-lg text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {leaves.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No upcoming leaves scheduled.</td></tr>
                      ) : (
                        leaves.map(leave => (
                          <tr key={leave.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">
                              {format(new Date(leave.start_date), 'MMM d, yyyy')} - {format(new Date(leave.end_date), 'MMM d, yyyy')}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{leave.reason}</td>
                            <td className="px-4 py-3 text-muted-foreground">{format(new Date(leave.created_at), 'MMM d, yyyy')}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => cancelLeave(leave.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Cancel</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">Active Sessions</h2>
                    <p className="text-sm text-muted-foreground">Manage devices currently logged into your account.</p>
                  </div>
                  <button onClick={handleLogoutAll} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors">
                    <LogOut className="h-4 w-4" /> Logout All Devices
                  </button>
                </div>
                
                <div className="space-y-3">
                  {sessions.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">No active sessions found.</div>
                  ) : (
                    sessions.map(session => (
                      <div key={session.id} className="flex items-center justify-between p-4 border rounded-xl bg-background hover:border-primary/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-muted rounded-lg"><User className="h-4 w-4 text-muted-foreground" /></div>
                          <div>
                            <div className="text-sm font-medium text-foreground line-clamp-1 max-w-[200px] sm:max-w-xs">{session.user_agent}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">IP: {session.ip_address} • Started {format(new Date(session.created_at), 'MMM d, yyyy h:mm a')}</div>
                          </div>
                        </div>
                        <button onClick={() => revokeSession(session.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-md text-xs font-medium transition-colors">
                          Revoke
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                <div className="space-y-4">
                  {activityLogs.slice(0,5).map(log => (
                    <div key={log.id} className="flex items-start gap-3 border-b last:border-0 pb-4 last:pb-0">
                      <div className="h-2 w-2 mt-1.5 rounded-full bg-primary flex-shrink-0"></div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{log.activity}</div>
                        <div className="text-xs text-muted-foreground mt-1">{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')} • {log.ip_address}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-card border rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-lg font-semibold mb-2">Notification Preferences</h2>
              <p className="text-sm text-muted-foreground mb-8">Choose how you want to be notified about updates and alerts.</p>
              
              <form onSubmit={handleSaveNotifications} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Alerts</h3>
                  
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-background">
                    <div>
                      <div className="font-medium text-sm">Appointment Updates</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Receive alerts for new bookings and cancellations.</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifForm.appointment_alerts} onChange={e => setNotifForm({...notifForm, appointment_alerts: e.target.checked})} />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-background">
                    <div>
                      <div className="font-medium text-sm text-red-600">Emergency Alerts</div>
                      <div className="text-xs text-muted-foreground mt-0.5">High priority notifications for critical patient situations.</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifForm.emergency_alerts} onChange={e => setNotifForm({...notifForm, emergency_alerts: e.target.checked})} />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Delivery Methods</h3>
                  
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-background">
                    <div>
                      <div className="font-medium text-sm">Email Notifications</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Send alerts to {user?.email}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifForm.email_notifications} onChange={e => setNotifForm({...notifForm, email_notifications: e.target.checked})} />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-xl bg-background">
                    <div>
                      <div className="font-medium text-sm">SMS Notifications</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Send texts to {user?.phone || 'your verified number'}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" disabled={!user?.phone} className="sr-only peer" checked={notifForm.sms_notifications} onChange={e => setNotifForm({...notifForm, sms_notifications: e.target.checked})} />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                    </label>
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-70">
                    <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-2">Document Management</h2>
                <p className="text-sm text-muted-foreground mb-6">Upload and manage your medical licenses, identity proofs, and certificates.</p>
                
                <form onSubmit={handleUploadDoc} className="border-2 border-dashed rounded-xl p-8 text-center bg-muted/10 mb-8 transition-colors hover:bg-muted/30">
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <div className="max-w-sm mx-auto space-y-4">
                    <select className="w-full p-2.5 text-sm border rounded-md bg-background" value={docType} onChange={e => setDocType(e.target.value)}>
                      <option value="certificate">Medical Certificate</option>
                      <option value="license">Medical License</option>
                      <option value="identity">Identity Proof</option>
                    </select>
                    <input 
                      type="file" 
                      className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" 
                      onChange={e => setDocFile(e.target.files ? e.target.files[0] : null)}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <button type="submit" disabled={!docFile || isSaving} className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-md font-medium text-sm transition-colors disabled:opacity-50">
                      {isSaving ? "Uploading..." : "Upload Document"}
                    </button>
                  </div>
                </form>

                <h3 className="font-semibold mb-4">Uploaded Documents</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {documents.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-muted-foreground text-sm border rounded-xl">No documents uploaded yet.</div>
                  ) : (
                    documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-xl bg-background shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2.5 bg-primary/10 text-primary rounded-lg flex-shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate" title={doc.file_name}>{doc.file_name}</div>
                            <div className="text-xs text-muted-foreground capitalize mt-0.5">{doc.document_type} • {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <a href={doc.url} target="_blank" rel="noreferrer" className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-colors">
                            <Eye className="h-4 w-4" />
                          </a>
                          <button onClick={() => deleteDocument(doc.id)} className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
