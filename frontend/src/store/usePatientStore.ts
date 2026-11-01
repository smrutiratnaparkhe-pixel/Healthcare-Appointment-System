import { create } from 'zustand';
import api from '@/lib/api';

interface Patient {
  id: number;
  status: 'Active' | 'Under Treatment' | 'Critical' | 'Recovered';
  blood_group: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  gender: string;
  date_of_birth: string;
  address_line1: string;
  city: string;
  last_visit: string;
  allergies?: string | null;
  medical_history?: string | null;
}

interface AppointmentHistory {
  id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status_id: number;
  status_name: string;
  status_color: string;
  reason: string;
  consultation_type: string;
}

interface MedicalReport {
  id: number;
  title: string;
  description: string;
  file_name: string;
  file_type: string;
  file_size: number;
  report_type: string;
  report_date: string;
  created_at: string;
  uploaded_by_name: string;
  uploaded_by_last_name?: string;
  uploader_role?: string;
}

interface DoctorNote {
  id: number;
  note: string;
  created_at: string;
}

interface PatientState {
  patients: Patient[];
  totalPatients: number;
  isLoading: boolean;
  error: string | null;
  patientDetails: Patient | null;
  history: AppointmentHistory[];
  reports: MedicalReport[];
  notes: DoctorNote[];
  isLoadingDetails: boolean;
  fetchPatients: (page?: number, limit?: number, search?: string, status?: string) => Promise<void>;
  fetchPatientDetails: (patientId: string | number) => Promise<void>;
  fetchPatientHistory: (patientId: string | number) => Promise<void>;
  fetchPatientReports: (patientId: string | number) => Promise<void>;
  fetchPatientNotes: (patientId: string | number) => Promise<void>;
  updatePatientStatus: (patientId: string | number, status: string) => Promise<void>;
  addPatientNote: (patientId: string | number, note: string) => Promise<void>;
  deletePatientNote: (patientId: string | number, noteId: string | number) => Promise<void>;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  totalPatients: 0,
  isLoading: false,
  error: null,
  patientDetails: null,
  history: [],
  reports: [],
  notes: [],
  isLoadingDetails: false,

  fetchPatients: async (page = 1, limit = 10, search = '', status = '') => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const response: any = await api.get(`/doctors/my-patients?${params.toString()}`);
      set({ 
        patients: response.data || [], 
        totalPatients: response.pagination?.total || response.meta?.total || 0,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch patients', error?.message || error);
      set({ error: error?.message || 'Failed to fetch patients', isLoading: false });
    }
  },

  fetchPatientDetails: async (patientId) => {
    set({ isLoadingDetails: true, error: null });
    try {
      const response: any = await api.get(`/doctors/my-patients/${patientId}`);
      set({ patientDetails: response.data, isLoadingDetails: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch patient details', isLoadingDetails: false });
    }
  },

  fetchPatientHistory: async (patientId) => {
    try {
      const response: any = await api.get(`/doctors/my-patients/${patientId}/history`);
      set({ history: response.data });
    } catch (error: any) {
      console.error('Failed to fetch history', error);
    }
  },

  fetchPatientReports: async (patientId) => {
    try {
      const response: any = await api.get(`/doctors/my-patients/${patientId}/reports`);
      set({ reports: response.data });
    } catch (error: any) {
      console.error('Failed to fetch reports', error);
    }
  },

  fetchPatientNotes: async (patientId) => {
    try {
      const response: any = await api.get(`/doctors/my-patients/${patientId}/notes`);
      set({ notes: response.data });
    } catch (error: any) {
      console.error('Failed to fetch notes', error);
    }
  },

  updatePatientStatus: async (patientId, status) => {
    try {
      await api.put(`/doctors/my-patients/${patientId}/status`, { status });
      // Update local state if patient Details is the same
      const currentDetails = get().patientDetails;
      if (currentDetails && currentDetails.id.toString() === patientId.toString()) {
        set({ patientDetails: { ...currentDetails, status: status as any } });
      }
      // Update in patients list
      set(state => ({
        patients: state.patients.map(p => p.id.toString() === patientId.toString() ? { ...p, status: status as any } : p)
      }));
    } catch (error: any) {
      throw error;
    }
  },

  addPatientNote: async (patientId, note) => {
    try {
      const response = await api.post(`/doctors/my-patients/${patientId}/notes`, { note });
      // Fetch notes again to update list
      await get().fetchPatientNotes(patientId);
    } catch (error: any) {
      throw error;
    }
  },

  deletePatientNote: async (patientId, noteId) => {
    try {
      await api.delete(`/doctors/my-patients/${patientId}/notes/${noteId}`);
      // Fetch notes again to update list
      await get().fetchPatientNotes(patientId);
    } catch (error: any) {
      throw error;
    }
  }
}));
