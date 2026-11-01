"use client";

import { useEffect, useState } from "react";
import { Users, Search, Filter, ShieldAlert, CheckCircle2, XCircle, Trash2, Shield, MoreVertical } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export default function ManageUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res: any = await api.get("/users?limit=50");
      setUsers(res.data || []);
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await api.put(`/users/${id}/status`, { isActive: !currentStatus });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      setUsers(users.map(u => u.id === id ? { ...u, is_active: !currentStatus ? 1 : 0 } : u));
    } catch (error: any) {
      toast.error(error.message || "Failed to update user status");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return;
    
    try {
      await api.delete(`/users/${id}`);
      toast.success("User deleted successfully");
      setUsers(users.filter(u => u.id !== id));
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.first_name + ' ' + u.last_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || (u.roles && u.roles.includes(roleFilter));
    
    const matchesStatus = statusFilter === "all" || 
                          (statusFilter === "active" && u.is_active) || 
                          (statusFilter === "inactive" && !u.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full h-full pb-10">
      
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Manage Users</h1>
            <p className="text-sm text-gray-500">View and control all member accounts on the platform.</p>
          </div>
        </div>
      </div>

      <Card className="bg-white border border-gray-100/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-[20px] overflow-hidden">
        <CardHeader className="border-b border-gray-50 pb-4 pt-6 px-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-[17px] font-semibold text-gray-900">All Members</CardTitle>
            <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 font-medium rounded-full px-2.5 shadow-none">{users.length}</Badge>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#10b981] bg-white text-gray-600 cursor-pointer shadow-sm min-w-[120px]"
            >
              <option value="all">All Roles</option>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="hospital_admin">Hospital Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#10b981] bg-white text-gray-600 cursor-pointer shadow-sm min-w-[110px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <div className="relative flex-1 sm:w-56 min-w-[150px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-medium">User ID</th>
                    <th className="px-6 py-4 font-medium">Member</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium">Hospital</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Joined Date</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="bg-white hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                          #{user.id.toString().padStart(6, '0')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-full border border-gray-100">
                            <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 font-semibold text-xs">
                              {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1 flex-wrap">
                          {user.roles ? user.roles.split(',').map((r: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="bg-white border-gray-200 text-gray-600 shadow-none text-[10px] uppercase tracking-wider">
                              {r.trim().replace('_', ' ')}
                            </Badge>
                          )) : (
                            <span className="text-gray-400 text-xs">No Role</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.roles?.includes('super_admin') ? (
                          <span className="text-sm text-gray-400">-</span>
                        ) : user.hospital_name ? (
                          <span className="text-sm text-gray-700 font-medium">{user.hospital_name}</span>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not Assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className={`shadow-none font-medium capitalize text-xs ${
                          user.is_active 
                            ? 'bg-[#ecfdf5] text-[#10b981] border-[#10b981]/20' 
                            : 'bg-[#fef2f2] text-[#ef4444] border-[#ef4444]/20'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {new Date(user.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {!user.roles?.includes('super_admin') && (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title={user.is_active ? "Deactivate User" : "Activate User"}
                              onClick={() => handleToggleStatus(user.id, user.is_active)}
                              className={`h-8 w-8 rounded-md transition-all shadow-sm ${
                                user.is_active 
                                  ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200" 
                                  : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200"
                              }`}
                            >
                              {user.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Delete User"
                              onClick={() => handleDeleteUser(user.id)}
                              className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 shadow-sm rounded-md transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <ShieldAlert className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No users found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
