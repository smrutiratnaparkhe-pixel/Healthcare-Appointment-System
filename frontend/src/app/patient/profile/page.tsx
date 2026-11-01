"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/useProfileStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  User, Shield, Bell, Activity, Phone, Mail, 
  MapPin, HeartPulse, ShieldCheck, Key, Laptop, LogOut
} from "lucide-react";
import api from "@/lib/api";

export default function ProfileSettings() {
  const { user, checkAuth } = useAuthStore();
  const { 
    sessions, notificationPreferences, 
    fetchSessions, revokeSession, 
    fetchNotificationPreferences, updateNotificationPreferences,
    updatePersonalProfile
  } = useProfileStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form States
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    lastName: "",
    email: "", // read-only
    phone: "",
    gender: "",
    dateOfBirth: "",
    addressLine1: "",
    city: ""
  });

  const [healthInfo, setHealthInfo] = useState({
    bloodGroup: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    allergies: "",
    medicalHistory: "" // Used for current medications / chronic diseases
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [notifications, setNotifications] = useState({
    appointment_alerts: true,
    emergency_alerts: true,
    email_notifications: true,
    sms_notifications: false
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        checkAuth(),
        fetchSessions(),
        fetchNotificationPreferences()
      ]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (user) {
      setPersonalInfo({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: (user as any).gender || "",
        dateOfBirth: (user as any).dateOfBirth ? (user as any).dateOfBirth.split('T')[0] : "",
        addressLine1: (user as any).addressLine1 || "",
        city: (user as any).city || ""
      });

      if (user.patient) {
        setHealthInfo({
          bloodGroup: user.patient.blood_group || "",
          emergencyContactName: user.patient.emergency_contact_name || "",
          emergencyContactPhone: user.patient.emergency_contact_phone || "",
          allergies: user.patient.allergies || "",
          medicalHistory: user.patient.medical_history || ""
        });
      }
    }
  }, [user]);

  useEffect(() => {
    if (notificationPreferences) {
      setNotifications({
        appointment_alerts: notificationPreferences.appointment_alerts,
        emergency_alerts: notificationPreferences.emergency_alerts,
        email_notifications: notificationPreferences.email_notifications,
        sms_notifications: notificationPreferences.sms_notifications
      });
    }
  }, [notificationPreferences]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      toast.info("Uploading avatar...");
      await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await checkAuth(); // Refresh user data
      toast.success("Avatar updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload avatar");
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updatePersonalProfile({
        ...personalInfo,
        ...healthInfo
      });
      await checkAuth(); // Refresh user data
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to change password");
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await updateNotificationPreferences(notifications);
      toast.success("Notification preferences updated");
    } catch (error: any) {
      toast.error("Failed to update preferences");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-40 w-full rounded-[24px]" />
        <Skeleton className="h-96 w-full rounded-[24px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Profile Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account details and preferences.</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3 max-w-[400px] mb-8 bg-gray-100/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-active:bg-white data-active:text-emerald-600 data-active:shadow-sm transition-all">Overview</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg data-active:bg-white data-active:text-emerald-600 data-active:shadow-sm transition-all">Security</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg data-active:bg-white data-active:text-emerald-600 data-active:shadow-sm transition-all">Notifications</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          
          {/* Profile Card Header */}
          <Card className="border-0 shadow-sm bg-white overflow-hidden rounded-[24px]">
            <div className="h-24 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
            <CardContent className="px-8 pb-8 relative pt-0">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12">
                <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-md relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                  <div className="w-full h-full rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl font-bold overflow-hidden relative">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</>
                    )}
                    <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all">
                      <span className="text-white text-xs font-semibold">Change</span>
                    </div>
                  </div>
                  <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-sm text-gray-500 font-medium">
                    <span className="flex items-center gap-1"><User className="w-4 h-4" /> Patient ID: P-{user?.id.toString().padStart(4, '0')}</span>
                    <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {user?.email}</span>
                  </div>
                </div>
                
                <div className="w-full md:w-64 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Profile Completion</span>
                    <span className="text-sm font-black text-emerald-600">{Math.round(((Object.values(personalInfo).filter(Boolean).length + Object.values(healthInfo).filter(Boolean).length) / (Object.keys(personalInfo).length + Object.keys(healthInfo).length)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.round(((Object.values(personalInfo).filter(Boolean).length + Object.values(healthInfo).filter(Boolean).length) / (Object.keys(personalInfo).length + Object.keys(healthInfo).length)) * 100)}%` }}></div>
                  </div>
                  <p className="text-[10px] font-medium text-gray-500 mt-2 text-center">Last updated: {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Today'}</p>
                </div>
                <div className="flex flex-col items-center justify-center bg-emerald-50 px-4 py-2 rounded-xl text-emerald-600 border border-emerald-100">
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Blood Group</span>
                  <span className="text-xl font-bold">{healthInfo.bloodGroup || "N/A"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card className="border-0 shadow-sm rounded-[24px]">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-500" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={personalInfo.firstName} onChange={e => setPersonalInfo({...personalInfo, firstName: e.target.value})} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={personalInfo.lastName} onChange={e => setPersonalInfo({...personalInfo, lastName: e.target.value})} className="rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={personalInfo.phone} onChange={e => setPersonalInfo({...personalInfo, phone: e.target.value})} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={personalInfo.dateOfBirth} onChange={e => setPersonalInfo({...personalInfo, dateOfBirth: e.target.value})} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address Line 1</Label>
                  <Input value={personalInfo.addressLine1} onChange={e => setPersonalInfo({...personalInfo, addressLine1: e.target.value})} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={personalInfo.city} onChange={e => setPersonalInfo({...personalInfo, city: e.target.value})} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <select 
                      value={personalInfo.gender} 
                      onChange={e => setPersonalInfo({...personalInfo, gender: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all bg-white"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Health Information */}
            <Card className="border-0 shadow-sm rounded-[24px]">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-rose-500" />
                  Health Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Blood Group</Label>
                    <select 
                      value={healthInfo.bloodGroup} 
                      onChange={e => setHealthInfo({...healthInfo, bloodGroup: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all bg-white"
                    >
                      <option value="">Select</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Allergies</Label>
                    <Input value={healthInfo.allergies} onChange={e => setHealthInfo({...healthInfo, allergies: e.target.value})} placeholder="e.g. Penicillin, Peanuts" className="rounded-xl" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Current Medications & Chronic Diseases</Label>
                  <textarea 
                    value={healthInfo.medicalHistory} 
                    onChange={e => setHealthInfo({...healthInfo, medicalHistory: e.target.value})}
                    placeholder="List current medications and ongoing conditions..."
                    className="w-full border border-gray-200 p-3 rounded-xl min-h-[80px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all" 
                  />
                </div>

                <div className="pt-2 border-t border-gray-100 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contact Name</Label>
                      <Input value={healthInfo.emergencyContactName} onChange={e => setHealthInfo({...healthInfo, emergencyContactName: e.target.value})} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Phone</Label>
                      <Input value={healthInfo.emergencyContactPhone} onChange={e => setHealthInfo({...healthInfo, emergencyContactPhone: e.target.value})} className="rounded-xl" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 rounded-xl px-8 h-11">
              {isSaving ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-0 shadow-sm rounded-[24px]">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-500" />
                Change Password
              </CardTitle>
              <CardDescription>Update your password to keep your account secure.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 max-w-md">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} required minLength={6} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} required minLength={6} className="rounded-xl" />
                </div>
                <Button type="submit" className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl w-full">Update Password</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-[24px]">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Active Sessions
              </CardTitle>
              <CardDescription>Manage your active logins across devices.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {sessions.map(session => (
                  <div key={session.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-500">
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{session.user_agent || "Unknown Device"}</p>
                        <p className="text-xs text-gray-500 mt-1">IP: {session.ip_address} • Created: {new Date(session.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => revokeSession(session.id)} className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 border-gray-200">
                      <LogOut className="w-4 h-4 mr-2" /> Revoke
                    </Button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No active sessions found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS TAB */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-0 shadow-sm rounded-[24px] max-w-2xl">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-500" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how you want to be notified about updates.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">Appointment Reminders</h4>
                  <p className="text-sm text-gray-500 mt-1">Receive alerts before upcoming appointments.</p>
                </div>
                <div className={`w-12 h-6 rounded-full cursor-pointer transition-colors ${notifications.appointment_alerts ? 'bg-emerald-500' : 'bg-gray-200'}`} onClick={() => setNotifications({...notifications, appointment_alerts: !notifications.appointment_alerts})}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm mt-0.5 transition-transform ${notifications.appointment_alerts ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-500 mt-1">Get updates on your reports and prescriptions.</p>
                </div>
                <div className={`w-12 h-6 rounded-full cursor-pointer transition-colors ${notifications.email_notifications ? 'bg-emerald-500' : 'bg-gray-200'}`} onClick={() => setNotifications({...notifications, email_notifications: !notifications.email_notifications})}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm mt-0.5 transition-transform ${notifications.email_notifications ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">SMS Notifications</h4>
                  <p className="text-sm text-gray-500 mt-1">Receive text messages for urgent alerts.</p>
                </div>
                <div className={`w-12 h-6 rounded-full cursor-pointer transition-colors ${notifications.sms_notifications ? 'bg-emerald-500' : 'bg-gray-200'}`} onClick={() => setNotifications({...notifications, sms_notifications: !notifications.sms_notifications})}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm mt-0.5 transition-transform ${notifications.sms_notifications ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <Button onClick={handleSaveNotifications} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-6 shadow-lg shadow-emerald-500/20">Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
