import { create } from 'zustand';
import api from '@/lib/api';

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  hospital_id: number;
  slot_id: number;
  status_id: number;
  status_name: string;
  status_color: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  consultation_type: string;
  notes: string | null;
  cancellation_reason: string | null;
  doctor_first_name: string;
  doctor_last_name: string;
  doctor_avatar: string | null;
  patient_first_name?: string;
  patient_last_name?: string;
  patient_avatar?: string | null;
  hospital_name: string;
}

interface AppointmentState {
  appointments: Appointment[];
  totalAppointments: number;
  isLoading: boolean;
  error: string | null;
  
  fetchAppointments: (page?: number, limit?: number, status?: string, silent?: boolean) => Promise<void>;
  cancelAppointment: (id: number, reason: string) => Promise<void>;
  updateAppointment: (id: number, statusId?: number, notes?: string) => Promise<void>;
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  totalAppointments: 0,
  isLoading: false,
  error: null,

  fetchAppointments: async (page = 1, limit = 50, status = '', silent = false) => {
    if (!silent) set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (status) params.append('status', status);

      const response: any = await api.get(`/appointments?${params.toString()}`);
      set({ 
        appointments: response.data,
        totalAppointments: response.pagination?.total || response.data.length,
        isLoading: false 
      });
    } catch (error: any) {
      if (!silent) set({ error: error.message || 'Failed to fetch appointments', isLoading: false });
    }
  },

  cancelAppointment: async (id: number, reason: string) => {
    try {
      await api.put(`/appointments/${id}/cancel`, { reason });
      // Update local state instead of refetching to be faster
      set(state => ({
        appointments: state.appointments.map(app => 
          app.id === id 
            ? { ...app, status_id: 5, status_name: 'Cancelled', status_color: '#EF4444', cancellation_reason: reason } 
            : app
        )
      }));
    } catch (error: any) {
      throw error;
    }
  },

  updateAppointment: async (id: number, statusId?: number, notes?: string) => {
    try {
      const payload: any = {};
      if (statusId !== undefined) payload.statusId = statusId;
      if (notes !== undefined) payload.notes = notes;
      await api.put(`/appointments/${id}`, payload);
      
      const statusMap: Record<number, {name: string, color: string}> = {
        1: { name: 'Pending', color: '#F59E0B' },
        2: { name: 'Confirmed', color: '#10B981' },
        3: { name: 'In_Progress', color: '#3B82F6' },
        4: { name: 'Completed', color: '#6B7280' },
        5: { name: 'Cancelled', color: '#EF4444' },
        6: { name: 'No_Show', color: '#8B5CF6' },
        7: { name: 'Rescheduled', color: '#F97316' }
      };

      set(state => ({
        appointments: state.appointments.map(app => 
          app.id === id 
            ? { 
                ...app, 
                ...(statusId && statusMap[statusId] ? { status_id: statusId, status_name: statusMap[statusId].name, status_color: statusMap[statusId].color } : {}),
                ...(notes !== undefined ? { notes } : {})
              } 
            : app
        )
      }));
    } catch (error: any) {
      throw error;
    }
  }
}));
