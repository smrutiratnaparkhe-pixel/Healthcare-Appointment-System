"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { User, Shield, Key, Bell, Mail, Phone, Settings, Building2, MapPin } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AdminLocationMap = dynamic(() => import("@/components/map/AdminLocationMap"), { ssr: false });

export default function HospitalSettingsPage() {
  const { user, checkAuth } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    avatarUrl: "",
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        avatarUrl: user.avatar || "",
      });
      if (user.roles?.includes('hospital_admin') && user.hospitalAdmin?.hospital_id) {
        fetchHospitalLocation(user.hospitalAdmin.hospital_id);
      }
    }
  }, [user]);

  // Location Form
  const [hospitalLocation, setHospitalLocation] = useState<any>(null);
  const [mapPosition, setMapPosition] = useState<[number, number] | null>(null);
  const [isLocationSaving, setIsLocationSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleGeocode = async () => {
    if (!hospitalLocation?.address_line1 && !hospitalLocation?.city) {
      toast.error("Please enter at least an address or city to locate.");
      return;
    }
    setIsGeocoding(true);
    try {
      const query = [hospitalLocation.address_line1, hospitalLocation.city, hospitalLocation.state]
        .filter(Boolean)
        .join(", ");
      
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        setMapPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        toast.success("Location found on map!");
      } else {
        toast.error("Could not find this address on the map. Please refine it or place the marker manually.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to locate address automatically.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const fetchHospitalLocation = async (hospitalId: number) => {
    try {
      const res: any = await api.get(`/hospitals/${hospitalId}`);
      setHospitalLocation(res.data);
      if (res.data.latitude && res.data.longitude) {
        setMapPosition([parseFloat(res.data.latitude), parseFloat(res.data.longitude)]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLocationUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.hospitalAdmin?.hospital_id || !mapPosition) return;
    
    setIsLocationSaving(true);
    try {
      await api.put(`/hospitals/${user.hospitalAdmin.hospital_id}`, {
        latitude: mapPosition[0],
        longitude: mapPosition[1],
        addressLine1: hospitalLocation?.address_line1,
        city: hospitalLocation?.city,
        state: hospitalLocation?.state,
      });
      toast.success("Hospital location updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update location");
    } finally {
      setIsLocationSaving(false);
    }
  };

  // Notifications Form
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    appointmentAlerts: true,
    smsAlerts: false,
    securityAlerts: true,
    doctorActivityAlerts: false,
  });

  // Passwords
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error("New passwords do not match");
    }
    if (passwords.newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    try {
      setIsSaving(true);
      await api.put("/auth/change-password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success("Password changed successfully");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsProfileSaving(true);
      await api.put("/auth/profile", profileData);
      toast.success("Profile updated successfully");
      await checkAuth();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setProfileData((prev) => ({ ...prev, avatarUrl: base64String }));

      toast.promise(
        api.put("/auth/profile", { ...profileData, avatarUrl: base64String }).then(() => checkAuth()),
        {
          loading: "Uploading avatar...",
          success: "Avatar updated successfully!",
          error: "Failed to update avatar",
        }
      );
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setProfileData((prev) => ({ ...prev, avatarUrl: "" }));
    toast.promise(
      api.put("/auth/profile", { ...profileData, avatarUrl: "" }).then(() => checkAuth()),
      {
        loading: "Removing avatar...",
        success: "Avatar removed successfully!",
        error: "Failed to remove avatar",
      }
    );
  };

  const handleNotificationSave = () => {
    toast.success("Notification preferences saved successfully");
  };

  const passwordStrength = () => {
    const p = passwords.newPassword;
    if (p.length === 0) return { label: "", color: "", width: "0%" };
    if (p.length < 6) return { label: "Too Short", color: "bg-red-500", width: "20%" };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "40%" };
    if (score === 2) return { label: "Fair", color: "bg-amber-500", width: "60%" };
    if (score === 3) return { label: "Good", color: "bg-blue-500", width: "80%" };
    return { label: "Strong", color: "bg-emerald-500", width: "100%" };
  };

  const strength = passwordStrength();

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full h-full pb-10">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Profile Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your personal profile, security, and notification preferences.</p>
        </div>
      </div>

      <Tabs defaultValue="profile" orientation="vertical" className="flex flex-col md:flex-row gap-8 w-full items-start">
        {/* Sidebar Navigation */}
        <TabsList className="flex flex-row md:flex-col w-full md:w-64 h-auto p-2 gap-2 bg-transparent justify-start items-stretch border-none">
          <TabsTrigger
            value="profile"
            className="rounded-xl px-4 py-3.5 text-sm font-medium justify-start text-gray-600 border border-transparent data-[state=active]:bg-white data-[state=active]:text-[#10b981] data-[state=active]:shadow-sm data-[state=active]:border-gray-200 transition-all"
          >
            <User className="w-4 h-4 mr-3" /> Profile Details
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="rounded-xl px-4 py-3.5 text-sm font-medium justify-start text-gray-600 border border-transparent data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=active]:border-gray-200 transition-all"
          >
            <Key className="w-4 h-4 mr-3" /> Security & Password
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="rounded-xl px-4 py-3.5 text-sm font-medium justify-start text-gray-600 border border-transparent data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm data-[state=active]:border-gray-200 transition-all"
          >
            <Bell className="w-4 h-4 mr-3" /> Notifications
          </TabsTrigger>
          {user.roles?.includes('hospital_admin') && (
            <TabsTrigger
              value="location"
              className="rounded-xl px-4 py-3.5 text-sm font-medium justify-start text-gray-600 border border-transparent data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm data-[state=active]:border-gray-200 transition-all"
            >
              <MapPin className="w-4 h-4 mr-3" /> Hospital Location
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab Contents */}
        <div className="flex-1 w-full min-w-0">
          {/* ===== PROFILE TAB ===== */}
          <TabsContent value="profile" className="m-0 focus-visible:outline-none">
            <Card className="border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-[20px] overflow-hidden">
              <CardHeader className="bg-white border-b border-gray-50 pb-6">
                <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#10b981]" /> Personal Information
                </CardTitle>
                <CardDescription>Update your personal details and public profile.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-10 items-start">
                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="w-32 h-32 rounded-full border-4 border-emerald-50 shadow-md">
                      <AvatarImage src={profileData.avatarUrl} />
                      <AvatarFallback className="bg-gray-100 text-gray-400">
                        <User className="w-12 h-12" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col w-full gap-2">
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarChange} />
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="w-full rounded-xl h-10 text-sm font-medium shadow-sm hover:bg-gray-50 hover:text-gray-900 border-gray-200"
                      >
                        Upload Image
                      </Button>
                      <Button
                        type="button"
                        onClick={handleRemoveAvatar}
                        variant="ghost"
                        className="w-full rounded-xl h-10 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        Remove Avatar
                      </Button>
                    </div>
                  </div>

                  {/* Details Form */}
                  <form onSubmit={handleProfileUpdate} className="flex-1 space-y-6 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-gray-600 text-xs uppercase font-bold tracking-wider">First Name</Label>
                        <Input
                          value={profileData.firstName}
                          onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                          required
                          placeholder="e.g. John"
                          className="h-12 border-gray-200 rounded-xl text-gray-900 shadow-sm focus-visible:ring-[#10b981]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-600 text-xs uppercase font-bold tracking-wider">Last Name</Label>
                        <Input
                          value={profileData.lastName}
                          onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                          required
                          placeholder="e.g. Doe"
                          className="h-12 border-gray-200 rounded-xl text-gray-900 shadow-sm focus-visible:ring-[#10b981]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-gray-600 text-xs uppercase font-bold tracking-wider flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" /> Email Address
                        </Label>
                        <Input
                          value={user.email}
                          readOnly
                          className="h-12 bg-gray-50 border-gray-200 rounded-xl text-gray-500 shadow-none focus-visible:ring-0 cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-600 text-xs uppercase font-bold tracking-wider flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" /> Phone Number
                        </Label>
                        <Input
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          className="h-12 border-gray-200 rounded-xl text-gray-900 shadow-sm focus-visible:ring-[#10b981]"
                          placeholder="e.g. +91 98765 43210"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label className="text-gray-600 text-xs uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-gray-400" /> Current Role
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {user.roles?.map((role) => (
                          <div
                            key={role}
                            className="px-4 py-2 rounded-lg bg-[#ecfdf5] text-[#10b981] font-bold text-xs uppercase tracking-wider border border-[#10b981]/20 shadow-sm"
                          >
                            {role.replace("_", " ")}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hospital Info */}
                    {user.hospitalAdmin && (
                      <div className="space-y-3 pt-2">
                        <Label className="text-gray-600 text-xs uppercase font-bold tracking-wider flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" /> Hospital
                        </Label>
                        <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 font-semibold text-sm">
                          {user.hospitalAdmin.hospital_name || "Not assigned"}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-50 flex justify-end">
                      <Button
                        type="submit"
                        disabled={isProfileSaving}
                        className="bg-[#10b981] hover:bg-[#059669] text-white shadow-lg shadow-emerald-500/20 h-11 px-8 rounded-xl font-medium"
                      >
                        {isProfileSaving ? "Saving..." : "Save Profile Changes"}
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== SECURITY TAB ===== */}
          <TabsContent value="security" className="m-0 focus-visible:outline-none">
            <Card className="border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-[20px] overflow-hidden">
              <CardHeader className="bg-white border-b border-gray-50 pb-6">
                <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-500" /> Change Password
                </CardTitle>
                <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Current Password</Label>
                    <Input
                      type="password"
                      required
                      placeholder="Enter current password"
                      className="h-12 rounded-xl border-gray-200 focus-visible:ring-indigo-500 shadow-sm"
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">New Password</Label>
                    <Input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Enter new password"
                      className="h-12 rounded-xl border-gray-200 focus-visible:ring-indigo-500 shadow-sm"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    />
                    {passwords.newPassword.length > 0 && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${strength.color} transition-all duration-500 rounded-full`} style={{ width: strength.width }} />
                        </div>
                        <p className={`text-[11px] font-semibold mt-1 ${strength.color.replace("bg-", "text-")}`}>{strength.label}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Confirm New Password</Label>
                    <Input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Re-enter new password"
                      className="h-12 rounded-xl border-gray-200 focus-visible:ring-indigo-500 shadow-sm"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    />
                    {passwords.confirmPassword.length > 0 && passwords.newPassword !== passwords.confirmPassword && (
                      <p className="text-[11px] font-semibold text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 mt-2 font-medium"
                  >
                    {isSaving ? "Updating Security..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== NOTIFICATIONS TAB ===== */}
          <TabsContent value="notifications" className="m-0 focus-visible:outline-none">
            <Card className="border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-[20px] overflow-hidden">
              <CardHeader className="bg-white border-b border-gray-50 pb-6">
                <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" /> Notification Preferences
                </CardTitle>
                <CardDescription>Choose what alerts and emails you want to receive.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8 flex flex-col items-start justify-center">
                <div className="space-y-4 w-full max-w-xl">
                  {[
                    { key: "emailAlerts" as const, title: "Email Notifications", desc: "Receive system updates via email" },
                    { key: "appointmentAlerts" as const, title: "Appointment Alerts", desc: "Get notified when appointments are booked or changed" },
                    { key: "doctorActivityAlerts" as const, title: "Doctor Activity Alerts", desc: "Alerts when doctors update schedules or availability" },
                    { key: "smsAlerts" as const, title: "SMS Alerts", desc: "Get critical alerts on your phone" },
                    { key: "securityAlerts" as const, title: "Security Alerts", desc: "Receive alerts for new sign-ins and security events" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 shadow-sm bg-white">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 text-sm">{item.title}</span>
                        <span className="text-sm text-gray-500">{item.desc}</span>
                      </div>
                      <button
                        onClick={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                        className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ml-4 ${
                          notifications[item.key] ? "bg-amber-500" : "bg-gray-200"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow-sm absolute transition-transform transform ${
                            notifications[item.key] ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}

                  <Button
                    onClick={handleNotificationSave}
                    className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 h-11 px-8 rounded-xl font-medium mt-4"
                  >
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== LOCATION TAB ===== */}
          {user.roles?.includes('hospital_admin') && (
            <TabsContent value="location" className="m-0 focus-visible:outline-none">
              <Card className="border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-[20px] overflow-hidden">
                <CardHeader className="bg-white border-b border-gray-50 pb-6">
                  <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-rose-500" /> Hospital Location
                  </CardTitle>
                  <CardDescription>Drag the marker or click on the map to accurately pinpoint your hospital's location for patients.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                  <form onSubmit={handleLocationUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">Street Address</Label>
                          <Input
                            value={hospitalLocation?.address_line1 || ""}
                            onChange={(e) => setHospitalLocation({ ...hospitalLocation, address_line1: e.target.value })}
                            placeholder="Enter street address"
                            className="h-11 rounded-xl border-gray-200 focus-visible:ring-rose-500 shadow-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-gray-700 font-medium">City</Label>
                            <Input
                              value={hospitalLocation?.city || ""}
                              onChange={(e) => setHospitalLocation({ ...hospitalLocation, city: e.target.value })}
                              placeholder="City"
                              className="h-11 rounded-xl border-gray-200 focus-visible:ring-rose-500 shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-700 font-medium">State</Label>
                            <Input
                              value={hospitalLocation?.state || ""}
                              onChange={(e) => setHospitalLocation({ ...hospitalLocation, state: e.target.value })}
                              placeholder="State"
                              className="h-11 rounded-xl border-gray-200 focus-visible:ring-rose-500 shadow-sm"
                            />
                          </div>
                        </div>
                        <div className="pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isGeocoding}
                            onClick={handleGeocode}
                            className="w-full h-11 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-medium"
                          >
                            {isGeocoding ? "Locating..." : "Locate Address on Map"}
                          </Button>
                        </div>
                        
                        <Button
                          type="submit"
                          disabled={isLocationSaving || !mapPosition}
                          className="w-full bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 h-11 rounded-xl font-medium mt-4"
                        >
                          {isLocationSaving ? "Saving..." : "Save Location"}
                        </Button>
                      </div>

                      <div className="h-[400px] bg-gray-100 rounded-xl overflow-hidden shadow-inner border border-gray-200">
                        <AdminLocationMap position={mapPosition} onPositionChange={setMapPosition} />
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
