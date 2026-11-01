"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { FileText, Search, Download, Eye, Calendar, User, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function DoctorReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReportUrl, setSelectedReportUrl] = useState<string | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res: any = await api.get("/reports/shared");
        setReports(res.data || []);
      } catch (e: any) {
        console.error("Failed to fetch shared reports", e?.message || e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  const filteredReports = reports.filter(r =>
    r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.patient_first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.patient_last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownload = async (reportId: number, fileName: string) => {
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
    } catch (e) {
      toast.error("Error downloading report");
    }
  };

  const handlePreview = async (reportId: number, fileType: string) => {
    try {
      const res: any = await api.get(`/reports/${reportId}/download`);
      if (res.data?.url) {
        setSelectedReportUrl(res.data.url);
        setSelectedReportType(fileType);
      } else {
        toast.error("Could not load preview");
      }
    } catch (e) {
      toast.error("Error loading preview");
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'prescription': return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'lab_result': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'imaging': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'discharge_summary': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Patient Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Medical reports shared with you by your patients.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <FileText className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Shared Reports</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {searchQuery ? "No reports match your search." : "No patients have shared their medical reports with you yet."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredReports.map((report) => (
            <Card key={report.id} className="group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-gray-100 rounded-2xl overflow-hidden bg-white">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${getTypeColor(report.report_type)}`}>
                    {(report.report_type || 'other').replace('_', ' ')}
                  </Badge>
                </div>

                <h3 className="text-sm font-bold text-gray-900 line-clamp-1 mb-1 group-hover:text-primary transition-colors" title={report.title}>
                  {report.title}
                </h3>

                <div className="space-y-1.5 mt-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span className="font-semibold text-gray-700">{report.patient_first_name} {report.patient_last_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {report.report_date ? format(parseISO(report.report_date.split('T')[0]), 'MMM dd, yyyy') : 'N/A'}
                  </div>
                  {report.access_type && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Access: <span className="capitalize font-medium">{report.access_type}</span>
                      {report.expires_at && <> · Expires {format(parseISO(report.expires_at.split('T')[0]), 'MMM d')}</>}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 flex gap-2">
                  <Dialog>
                    <DialogTrigger onClick={() => handlePreview(report.id, report.file_type)} className="flex-1 inline-flex items-center justify-center gap-2 text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 rounded-lg px-3">
                      <Eye className="w-3.5 h-3.5" /> Preview
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
                          <div className="w-full h-full flex items-center justify-center">Loading preview...</div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" className="flex-1 text-xs h-8 rounded-lg bg-primary hover:bg-primary/90" onClick={() => handleDownload(report.id, report.file_name || report.title)}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
