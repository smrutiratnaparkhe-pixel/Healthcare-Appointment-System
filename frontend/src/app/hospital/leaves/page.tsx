"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import api from "@/lib/api";
import { Loader2, Calendar, User, Clock, CheckCircle2, XCircle, FileText, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function LeaveRequestsPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [actionType, setActionType] = useState<"approved" | "rejected" | null>(null);
  const [adminComment, setAdminComment] = useState("");

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/hospital-manage/leaves');
      setLeaves(res.data || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const openActionModal = (leave: any, type: "approved" | "rejected") => {
    setSelectedLeave(leave);
    setActionType(type);
    setAdminComment("");
    setIsActionModalOpen(true);
  };

  const submitAction = async () => {
    if (!selectedLeave || !actionType) return;
    setProcessingId(selectedLeave.id);
    try {
      await api.put(`/hospital-manage/leaves/${selectedLeave.id}/status`, {
        status: actionType,
        adminComment: adminComment
      });
      toast.success(`Leave request ${actionType} successfully`);
      setIsActionModalOpen(false);
      fetchLeaves();
    } catch (e: any) {
      toast.error(e.message || "Failed to update leave status");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
        <p className="text-slate-500 font-medium">Loading leave requests...</p>
      </div>
    );
  }

  const pendingLeaves = leaves.filter(l => l.status === "pending");
  const pastLeaves = leaves.filter(l => l.status !== "pending");

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Leave Requests</h1>
          <p className="text-slate-500 mt-1">Review and manage time-off requests from your doctors.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Action Required ({pendingLeaves.length})
          </h2>
          {pendingLeaves.length === 0 ? (
            <Card className="border-dashed shadow-sm">
              <CardContent className="p-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 border border-slate-100">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-slate-600 font-medium">All caught up!</p>
                <p className="text-sm text-slate-500 mt-1">No pending leave requests require your attention.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingLeaves.map(leave => (
                <LeaveCard 
                  key={leave.id} 
                  leave={leave} 
                  onApprove={() => openActionModal(leave, "approved")}
                  onReject={() => openActionModal(leave, "rejected")}
                  isProcessing={processingId === leave.id}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 mt-8">
            <FileText className="w-5 h-5 text-slate-500" /> Past Requests
          </h2>
          {pastLeaves.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm border border-dashed rounded-xl bg-slate-50/50">
              No historical leave requests found.
            </div>
          ) : (
            <div className="grid gap-4">
              {pastLeaves.map(leave => (
                <LeaveCard key={leave.id} leave={leave} getStatusBadge={getStatusBadge} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{actionType === 'approved' ? 'Approve Leave' : 'Reject Leave'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionType} the leave request for Dr. {selectedLeave?.first_name} {selectedLeave?.last_name}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-semibold text-slate-700 mb-2 block">
              Admin Comment (Optional)
            </label>
            <Textarea
              placeholder="Add a note for the doctor..."
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              className="resize-none h-24"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionModalOpen(false)}>Cancel</Button>
            <Button 
              variant={actionType === 'approved' ? 'default' : 'destructive'} 
              className={actionType === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={submitAction}
              disabled={processingId !== null}
            >
              {processingId !== null ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {actionType === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeaveCard({ leave, onApprove, onReject, isProcessing, getStatusBadge }: any) {
  const startDate = new Date(leave.start_date);
  const endDate = new Date(leave.end_date);
  const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;

  return (
    <Card className="shadow-sm border-slate-200 transition-all hover:shadow-md overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center">
        {/* Left Side: Dates */}
        <div className="bg-slate-50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 min-w-[180px]">
          <div className="text-center">
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
              {format(startDate, 'MMM')} - {format(endDate, 'MMM')}
            </div>
            <div className="text-2xl font-black text-slate-800">
              {format(startDate, 'dd')} <span className="text-slate-300 font-medium mx-1">→</span> {format(endDate, 'dd')}
            </div>
            <div className="text-xs font-semibold bg-white border px-2 py-1 rounded-md text-slate-600 mt-3 shadow-sm inline-block">
              {daysCount} {daysCount === 1 ? 'Day' : 'Days'}
            </div>
          </div>
        </div>
        
        {/* Middle: Details */}
        <div className="p-6 flex-1">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                Dr. {leave.first_name} {leave.last_name}
              </h3>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <Calendar className="w-3.5 h-3.5" /> Requested on {format(new Date(leave.created_at), 'PPP')}
              </p>
            </div>
            {getStatusBadge ? getStatusBadge(leave.status) : null}
          </div>
          
          <div className="bg-white p-3 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Reason:</strong> {leave.reason}
          </div>

          {leave.admin_comment && (
            <div className="mt-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-sm text-blue-800">
              <strong className="text-blue-900">Admin Note:</strong> {leave.admin_comment}
            </div>
          )}
        </div>

        {/* Right Side: Actions (if pending) */}
        {!getStatusBadge && (
          <div className="p-6 pt-0 md:pt-6 flex flex-row md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50/30">
            <Button 
              className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/20" 
              onClick={onApprove}
              disabled={isProcessing}
            >
              <Check className="w-4 h-4 mr-2" /> Approve
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 md:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" 
              onClick={onReject}
              disabled={isProcessing}
            >
              <X className="w-4 h-4 mr-2" /> Reject
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
