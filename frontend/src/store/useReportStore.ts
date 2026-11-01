import { create } from 'zustand';
import api from '@/lib/api';

export interface MedicalReport {
  id: number;
  patient_id: number;
  appointment_id: number | null;
  title: string;
  description: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  report_type: string;
  report_date: string;
  uploaded_by: number;
  uploaded_by_name: string;
  created_at: string;
}

export interface ReportShare {
  access_id: number;
  doctor_id: number;
  doctor_first_name: string;
  doctor_last_name: string;
  specialties: string;
  access_type: string;
  expires_at: string;
  created_at: string;
}

interface ReportState {
  reports: MedicalReport[];
  activeShares: ReportShare[];
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  
  fetchMyReports: () => Promise<void>;
  uploadReport: (formData: FormData) => Promise<void>;
  downloadReport: (id: number, fileName: string) => Promise<void>;
  deleteReport: (id: number) => Promise<void>;
  shareReport: (id: number, doctorId: number, accessType: string, expiresInDays: number) => Promise<void>;
  fetchReportShares: (reportId: number) => Promise<void>;
  revokeReportShare: (accessId: number, reportId: number) => Promise<void>;
}

export const useReportStore = create<ReportState>((set, get) => ({
  reports: [],
  activeShares: [],
  isLoading: false,
  isUploading: false,
  error: null,

  fetchMyReports: async () => {
    set({ isLoading: true, error: null });
    try {
      const response: any = await api.get('/reports/my');
      set({ reports: response.data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch reports', isLoading: false });
    }
  },

  uploadReport: async (formData: FormData) => {
    set({ isUploading: true, error: null });
    try {
      // Must use multipart/form-data
      await api.post('/reports/upload', formData, {
        headers: { 'Content-Type': undefined }
      });
      // Refresh the list after successful upload
      await get().fetchMyReports();
      set({ isUploading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to upload report', isUploading: false });
      throw error;
    }
  },

  downloadReport: async (id: number, fileName: string) => {
    try {
      const response: any = await api.get(`/reports/${id}/download`);
      const { url } = response.data;
      
      // Trigger browser download via anchor tag
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error: any) {
      throw error;
    }
  },

  deleteReport: async (id: number) => {
    try {
      await api.delete(`/reports/${id}`);
      set(state => ({
        reports: state.reports.filter(report => report.id !== id)
      }));
    } catch (error: any) {
      throw error;
    }
  },

  shareReport: async (id: number, doctorId: number, accessType: string, expiresInDays: number) => {
    try {
      await api.post(`/reports/${id}/share`, {
        doctorId,
        accessType,
        expiresInDays
      });
      // Optionally refresh shares if we already had them loaded
      await get().fetchReportShares(id);
    } catch (error: any) {
      throw error;
    }
  },

  fetchReportShares: async (reportId: number) => {
    try {
      const response: any = await api.get(`/reports/${reportId}/shares`);
      set({ activeShares: response.data || [] });
    } catch (error: any) {
      set({ activeShares: [] });
      console.error('Failed to fetch report shares:', error);
    }
  },

  revokeReportShare: async (accessId: number, reportId: number) => {
    try {
      await api.put(`/reports/access/${accessId}/revoke`);
      // Update local state by removing the revoked share
      set(state => ({
        activeShares: state.activeShares.filter(share => share.access_id !== accessId)
      }));
    } catch (error: any) {
      throw error;
    }
  }
}));
