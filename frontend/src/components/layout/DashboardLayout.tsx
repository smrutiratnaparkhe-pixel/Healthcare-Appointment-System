"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Activity, 
  LayoutDashboard, 
  Calendar, 
  FileText, 
  Map, 
  UserCircle, 
  LogOut, 
  Menu,
  X,
  Bell,
  Search,
  Settings,
  Users,
  Building,
  ShieldAlert,
  Layers
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useSocketStore } from "@/store/useSocketStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DashboardLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "patient" | "doctor" | "hospital_admin" | "super_admin";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const { connect: connectSocket, disconnect: disconnectSocket } = useSocketStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [customPopup, setCustomPopup] = useState<any>(null);
  const lastNotifIdRef = useRef<number | null>(null);

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      // Smooth frequency slide for a pleasant "pop" sound
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  };

  const fetchNotifications = async (silent = false) => {
    if (!isAuthenticated) return;
    try {
      const [listRes, countRes]: any = await Promise.all([
        api.get('/notifications?limit=10'),
        api.get('/notifications/unread-count')
      ]);
      const newNotifs = listRes.data || [];
      
      if (newNotifs.length > 0) {
        const latestId = newNotifs[0].id;
        
        // Trigger sound and custom animated popup only if a NEW notification arrives
        if (lastNotifIdRef.current !== null && latestId > lastNotifIdRef.current) {
          playNotificationSound();
          setCustomPopup(newNotifs[0]);
          
          // Auto-hide popup after 6 seconds
          setTimeout(() => setCustomPopup(null), 6000);
        }
        // Also show popup if they just logged in and there is an unread notification
        else if (lastNotifIdRef.current === null && (countRes.data?.count || 0) > 0 && newNotifs[0].is_read === 0) {
          setCustomPopup(newNotifs[0]);
          setTimeout(() => setCustomPopup(null), 6000);
        }
        
        // Update highest seen ID
        lastNotifIdRef.current = Math.max(lastNotifIdRef.current || 0, latestId);
      }
      
      setNotifications(newNotifs);
      setUnreadCount(countRes.data?.count || 0);
    } catch (e) {
      if (!silent) console.error("Failed to fetch notifications", e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      // Connect socket.io
      const token = document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];
      if (token) {
        let hospId = undefined;
        if (role === 'hospital_admin' && user?.hospitalAdmin?.hospital_id) hospId = user.hospitalAdmin.hospital_id;
        else if (role === 'doctor' && user?.doctor?.hospital_id) hospId = user.doctor.hospital_id;
        connectSocket(token, hospId);
      }

      fetchNotifications();
      const interval = setInterval(() => fetchNotifications(true), 15000); // 15 seconds
      return () => {
        clearInterval(interval);
        disconnectSocket();
      };
    }
  }, [isAuthenticated, role, user, connectSocket, disconnectSocket]);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    } else if (!isLoading && user && (!user.roles || !user.roles.includes(role))) {
      // Redirect to their actual dashboard if they try to access wrong role
      if (user.roles?.includes("super_admin")) router.push("/admin");
      else if (user.roles?.includes("hospital_admin")) router.push("/hospital");
      else if (user.roles?.includes("doctor")) router.push("/doctor");
      else router.push("/patient");
    } else if (!isLoading && user && role === "doctor" && user.firstLoginCompleted === false && pathname !== "/doctor/setup") {
      // Force doctor first-login password setup
      router.push("/doctor/setup");
    }
  }, [isAuthenticated, isLoading, user, router, role, pathname]);

  if (isLoading || !isAuthenticated || (user && (!user.roles || !user.roles.includes(role)))) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Activity className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getNavItems = () => {
    let basePath: string = role;
    if (role === "super_admin") basePath = "admin";
    if (role === "hospital_admin") basePath = "hospital";

    const baseNav = [
      { href: `/${basePath}`, label: "Overview", icon: LayoutDashboard },
    ];

    if (role === "patient") {
      return [
        ...baseNav,
        { href: `/${role}/appointments`, label: "Appointments", icon: Calendar },
        { href: `/${role}/reports`, label: "Medical Records", icon: FileText },
        { href: `/discover`, label: "Find Care", icon: Map },
        { href: `/${role}/profile`, label: "Profile Settings", icon: Settings },
      ];
    } else if (role === "doctor") {
      return [
        ...baseNav,
        { href: `/${role}/schedule`, label: "My Schedule", icon: Calendar },
        { href: `/${role}/appointments`, label: "Patient Appointments", icon: Users },
        { href: `/${role}/patients`, label: "Patient Records", icon: FileText },
        { href: `/${role}/profile`, label: "Profile Settings", icon: Settings },
      ];
    } else if (role === "super_admin") {
      return [
        ...baseNav,
        { href: `/admin/users`, label: "Manage Users", icon: Users },
        { href: `/admin/hospitals`, label: "Hospitals", icon: Building },
        { href: `/admin/settings`, label: "Profile Settings", icon: Settings },
      ]
    } else if (role === "hospital_admin") {
      return [
        ...baseNav,
        { href: `/hospital/departments`, label: "Departments", icon: Layers },
        { href: `/hospital/doctors`, label: "Manage Doctors", icon: Users },
        { href: `/hospital/appointments`, label: "Appointments", icon: Calendar },
        { href: `/hospital/leaves`, label: "Leave Requests", icon: FileText },
        { href: `/hospital/settings`, label: "Profile Settings", icon: Settings },
      ]
    }
    
    return baseNav;
  };

  const isPendingHospital = role === "hospital_admin" && user?.hospitalAdmin && !user.hospitalAdmin.hospital_is_verified;
  const isSuspendedHospital = role === "hospital_admin" && user?.hospitalAdmin && user.hospitalAdmin.hospital_is_verified && !user.hospitalAdmin.hospital_is_active;
  const isBlockedHospital = isPendingHospital || isSuspendedHospital;

  const navItems = isBlockedHospital ? [] : getNavItems();

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-[#f8fafc] border-r border-gray-200 transform transition-transform duration-200 ease-in-out flex flex-col
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#10b981] shadow-sm shadow-emerald-500/20 flex items-center justify-center text-white">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-lg font-semibold text-gray-900 tracking-tight">Medi</span>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden ml-auto h-8 w-8 text-gray-500"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200
                  ${isActive 
                    ? "bg-white text-gray-900 shadow-sm border border-gray-100/50" 
                    : "text-gray-500 hover:bg-gray-100/60 hover:text-gray-900"}
                `}>
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-[#10b981]' : 'text-gray-400'}`} />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer User Profile */}
        <div className="p-3 border-t border-gray-100 mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center w-full gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors text-left focus:outline-none">
              <Avatar className="w-9 h-9 rounded-full border-2 border-white shadow-sm">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-400 text-white rounded-full text-xs font-bold">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider truncate">
                  {role.replace('_', ' ')}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2 rounded-xl border border-gray-100 shadow-xl" align="start" side="top">
              <DropdownMenuItem onClick={() => router.push(`/${role === 'super_admin' ? 'admin' : role === 'hospital_admin' ? 'hospital' : role}/${role === 'super_admin' ? 'settings' : 'profile'}`)} className="p-2 cursor-pointer focus:bg-gray-50 flex items-center text-sm font-medium text-gray-700">
                <UserCircle className="w-4 h-4 mr-3 text-gray-400" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem onClick={() => logout()} className="p-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 font-medium text-sm flex items-center">
                <LogOut className="w-4 h-4 mr-3 text-red-500" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 sticky top-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden h-8 w-8 -ml-2 text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </Button>
            
            {/* Breadcrumbs-like title */}
            <div className="hidden sm:flex items-center text-sm font-medium text-gray-900 capitalize">
              {pathname === `/${role === "super_admin" ? "admin" : role === "hospital_admin" ? "hospital" : role}` 
                ? "Overview" 
                : pathname.split('/').pop()?.replace('-', ' ')}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Bar (Mock) */}
            <div className="hidden md:flex relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="h-8 w-64 pl-9 pr-4 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-gray-400"
              />
            </div>

            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="h-8 w-8 relative text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full flex items-center justify-center outline-none">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 shadow-lg border-gray-100 rounded-xl overflow-hidden p-0">
                <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors">
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif: any) => (
                      <div key={notif.id} className={`p-4 border-b border-gray-50 text-sm flex gap-3 transition-colors ${!notif.is_read ? 'bg-primary/5' : 'hover:bg-gray-50'}`}>
                        <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!notif.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{notif.title}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{notif.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center flex flex-col items-center text-gray-500">
                      <Bell className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-sm font-medium">No new notifications</p>
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto w-full">
          <div className="w-full h-full">
            {isPendingHospital ? (
              <div className="flex flex-col items-center justify-center h-[70vh] text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 rounded-full bg-amber-50 flex items-center justify-center mb-6 border border-amber-100 shadow-sm relative">
                  <div className="absolute inset-0 rounded-full animate-ping bg-amber-100 opacity-20"></div>
                  <ShieldAlert className="w-12 h-12 text-amber-500 relative z-10" />
                </div>
                <h2 className="text-3xl font-semibold text-gray-900 tracking-tight mb-3">Application Under Review</h2>
                <p className="text-gray-500 max-w-lg mx-auto text-base leading-relaxed">
                  Your registration for <strong className="text-gray-900">{user?.hospitalAdmin?.hospital_name}</strong> is currently being reviewed by our compliance team. 
                  You will be granted full access to the management dashboard once your facility is verified.
                </p>
                <div className="mt-8 flex items-center gap-3">
                  <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl border-gray-200">
                    Check Status Again
                  </Button>
                  <Button onClick={() => logout()} variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl">
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </Button>
                </div>
              </div>
            ) : isSuspendedHospital ? (
              <div className="flex flex-col items-center justify-center h-[70vh] text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-6 border border-red-100 shadow-sm">
                  <ShieldAlert className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-3xl font-semibold text-gray-900 tracking-tight mb-3">Account Suspended</h2>
                <p className="text-gray-500 max-w-lg mx-auto text-base leading-relaxed">
                  Access to <strong className="text-gray-900">{user?.hospitalAdmin?.hospital_name}</strong> has been suspended by the system administrator. 
                  Please contact support for further assistance.
                </p>
                <div className="mt-8 flex items-center gap-3">
                  <Button onClick={() => logout()} className="bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/20">
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </main>

      {/* Custom Real-time Notification Popup */}
      {customPopup && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-8 fade-in duration-500">
          <div className="bg-white border border-gray-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] rounded-2xl p-5 w-[350px] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
            <button 
              onClick={() => setCustomPopup(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-100">
                <Bell className="w-5 h-5 animate-bounce" style={{ animationIterationCount: 3 }} />
              </div>
              <div className="flex-1 pr-4">
                <h4 className="font-bold text-gray-900 text-[14px] mb-1 leading-tight">{customPopup.title}</h4>
                <p className="text-sm text-gray-500 leading-snug">{customPopup.message}</p>
                <div className="mt-3.5 flex items-center gap-2">
                  <Button 
                    size="sm" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md text-[11px] h-8 font-semibold uppercase tracking-wider"
                    onClick={() => {
                      setCustomPopup(null);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
