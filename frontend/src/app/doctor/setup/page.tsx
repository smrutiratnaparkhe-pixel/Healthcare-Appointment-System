"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ShieldCheck, Lock, Eye, EyeOff, Loader2, ArrowRight, KeyRound } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FirstLoginSetupPage() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const passwordStrength = () => {
    const p = form.newPassword;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.currentPassword) {
      toast.error("Please enter your temporary password");
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await api.put("/auth/first-login-setup", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      toast.success("Password set successfully! Welcome to MediConnect.");

      // Refresh the user data so first_login_completed = true
      await checkAuth();

      // Redirect to doctor dashboard
      router.push("/doctor");
    } catch (err: any) {
      toast.error(err.message || "Failed to set password");
    } finally {
      setIsLoading(false);
    }
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 p-4">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-100/30 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-100/20 rounded-full filter blur-[80px] pointer-events-none" />

      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in duration-500">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-lg shadow-emerald-500/10 mb-5">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
            Set Your Password
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
            Welcome, <strong className="text-gray-700">Dr. {user?.firstName} {user?.lastName}</strong>! 
            For security, please change your temporary password before accessing the dashboard.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xl shadow-gray-200/40 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Temporary Password */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Temporary Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter your temporary password"
                  value={form.currentPassword}
                  onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                  className="h-11 pl-10 pr-10 rounded-xl shadow-sm"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">New Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type={showNew ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={form.newPassword}
                  onChange={e => setForm({ ...form, newPassword: e.target.value })}
                  className="h-11 pl-10 pr-10 rounded-xl shadow-sm"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength meter */}
              {form.newPassword.length > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} transition-all duration-500 rounded-full`} style={{ width: strength.width }} />
                  </div>
                  <p className={`text-[11px] font-semibold mt-1 ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Confirm New Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  className="h-11 pl-10 pr-10 rounded-xl shadow-sm"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword && (
                <p className="text-[11px] font-semibold text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 text-base font-medium bg-[#10b981] hover:bg-[#059669] shadow-lg shadow-emerald-500/20 rounded-xl group mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Set Password & Continue
                  <ArrowRight className="w-4 h-4 ml-2 opacity-70 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-gray-400">
            <Activity className="w-3.5 h-3.5" />
            <span>MediConnect — Secure Healthcare Platform</span>
          </div>
        </div>
      </div>
    </div>
  );
}
