import { create } from 'zustand';
import api from '@/lib/api';

export interface DoctorDocument {
  id: number;
  document_type: 'certificate' | 'license' | 'identity';
  file_name: string;
  url: string;
  uploaded_at: string;
}

export interface DoctorLeave {
  id: number;
  start_date: string;
  end_date: string;
  reason: string;
  created_at: string;
}

export interface Session {
  id: number;
  ip_address: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
}

export interface ActivityLog {
  id: number;
  activity: string;
  details: any;
  module: string;
  ip_address: string;
  created_at: string;
}

export interface NotificationPreferences {
  appointment_alerts: boolean;
  emergency_alerts: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
}

interface ProfileState {
  documents: DoctorDocument[];
  leaves: DoctorLeave[];
  sessions: Session[];
  activityLogs: ActivityLog[];
  notificationPreferences: NotificationPreferences | null;
  isLoading: boolean;
  error: string | null;

  fetchDocuments: () => Promise<void>;
  uploadDocument: (file: File, type: string) => Promise<void>;
  deleteDocument: (id: number) => Promise<void>;

  fetchLeaves: () => Promise<void>;
  applyLeave: (startDate: string, endDate: string, reason: string) => Promise<void>;
  cancelLeave: (id: number) => Promise<void>;

  fetchSessions: () => Promise<void>;
  revokeSession: (id: number) => Promise<void>;

  fetchActivityLogs: () => Promise<void>;

  fetchNotificationPreferences: () => Promise<void>;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;

  updatePersonalProfile: (data: any) => Promise<void>;
  updateProfessionalProfile: (id: number | string, data: any) => Promise<void>;
  updateAvailability: (isAvailable: boolean, emergencyAvailability: boolean) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  documents: [],
  leaves: [],
  sessions: [],
  activityLogs: [],
  notificationPreferences: null,
  isLoading: false,
  error: null,

  fetchDocuments: async () => {
    try {
      const response: any = await api.get('/doctors/my-documents');
      set({ documents: response.data });
    } catch (error: any) {
      console.error(error);
    }
  },

  uploadDocument: async (file, type) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', type);
      await api.post('/doctors/my-documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await get().fetchDocuments();
    } catch (error: any) {
      throw error;
    }
  },

  deleteDocument: async (id) => {
    try {
      await api.delete(`/doctors/my-documents/${id}`);
      await get().fetchDocuments();
    } catch (error: any) {
      throw error;
    }
  },

  fetchLeaves: async () => {
    try {
      const response: any = await api.get('/doctors/my-leaves');
      set({ leaves: response.data });
    } catch (error: any) {
      console.error(error);
    }
  },

  applyLeave: async (startDate, endDate, reason) => {
    try {
      await api.post('/doctors/my-leaves', { startDate, endDate, reason });
      await get().fetchLeaves();
    } catch (error: any) {
      throw error;
    }
  },

  cancelLeave: async (id) => {
    try {
      await api.delete(`/doctors/my-leaves/${id}`);
      await get().fetchLeaves();
    } catch (error: any) {
      throw error;
    }
  },

  fetchSessions: async () => {
    try {
      const response: any = await api.get('/auth/sessions');
      set({ sessions: response.data });
    } catch (error: any) {
      console.error(error);
    }
  },

  revokeSession: async (id) => {
    try {
      await api.delete(`/auth/sessions/${id}`);
      await get().fetchSessions();
    } catch (error: any) {
      throw error;
    }
  },

  fetchActivityLogs: async () => {
    try {
      const response: any = await api.get('/auth/activity');
      set({ activityLogs: response.data });
    } catch (error: any) {
      console.error(error);
    }
  },

  fetchNotificationPreferences: async () => {
    try {
      const response: any = await api.get('/auth/notifications/preferences');
      set({ notificationPreferences: response.data });
    } catch (error: any) {
      console.error(error);
    }
  },

  updateNotificationPreferences: async (prefs) => {
    try {
      await api.put('/auth/notifications/preferences', {
        appointmentAlerts: prefs.appointment_alerts,
        emergencyAlerts: prefs.emergency_alerts,
        emailNotifications: prefs.email_notifications,
        smsNotifications: prefs.sms_notifications
      });
      await get().fetchNotificationPreferences();
    } catch (error: any) {
      throw error;
    }
  },

  updatePersonalProfile: async (data) => {
    try {
      await api.put('/auth/profile', data);
    } catch (error: any) {
      throw error;
    }
  },

  updateProfessionalProfile: async (id, data) => {
    try {
      await api.put(`/doctors/${id}`, data);
    } catch (error: any) {
      throw error;
    }
  },

  updateAvailability: async (isAvailable, emergencyAvailability) => {
    try {
      await api.put('/doctors/my-profile/availability', { isAvailable, emergencyAvailability });
    } catch (error: any) {
      throw error;
    }
  }
}));
