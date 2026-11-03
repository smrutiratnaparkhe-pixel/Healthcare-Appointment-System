import axios from 'axios';

function demoDataFor(url: string, method: string) {
  const path = url.split('?')[0].toLowerCase();
  const today = new Date();
  const date = (offset: number) => {
    const value = new Date(today);
    value.setDate(value.getDate() + offset);
    return value.toISOString().slice(0, 10);
  };

  if (method !== 'get') return { id: Date.now(), message: 'Demo action recorded for this session.' };
  if (path.includes('/analytics/dashboard')) return { totalUsers: 1284, totalPatients: 1032, totalDoctors: 186, totalHospitals: 24, totalAppointments: 946, todayAppointments: 18, totalReports: 327 };
  if (path.includes('/analytics/appointments/trends')) return Array.from({ length: 6 }, (_, index) => ({ date: date(index - 5), count: 18 + index * 3, completed: 12 + index, cancelled: 2 }));
  if (path.includes('/analytics/hospitals/')) return { totalAppointments: 126, todayAppointments: 8, totalDoctors: 18, totalPatients: 312, totalDepartments: 7 };
  if (path.includes('/doctors/my-dashboard-stats')) return { totalPatients: 84, totalAppointments: 126, todayAppointments: 5, completedAppointments: 102, upcomingAppointments: 12, rating: 4.8 };
  if (path.includes('/analytics/patients/stats') || path.includes('/analytics/audit-logs') || path.includes('/analytics/doctors/stats')) return [];
  if (path.includes('/analytics/patients/my-stats')) return { totalAppointments: 8, completedConsultations: 6, totalReports: 3, upcomingAppointments: 2 };
  if (path.includes('/analytics')) return {};
  if (path.includes('/notifications/unread-count')) return { count: 0 };
  if (path.includes('/notifications')) return [];
  if (path.includes('/hospital-manage') && path.includes('/stats')) return { totalAppointments: 126, todayAppointments: 8, pendingAppointments: 4 };
  if (path.includes('/appointments')) return [
    { id: 301, patient_id: 2, doctor_id: 3, hospital_id: 1, slot_id: 1, status_id: 2, status_name: 'Confirmed', status_color: '#10B981', appointment_date: date(1), start_time: '10:30:00', end_time: '11:00:00', reason: 'Annual health checkup', consultation_type: 'In-person', notes: null, cancellation_reason: null, doctor_first_name: 'Rahul', doctor_last_name: 'Sharma', doctor_avatar: null, patient_first_name: 'Aarav', patient_last_name: 'Mehta', patient_avatar: null, hospital_name: 'City Care Hospital' },
    { id: 302, patient_id: 2, doctor_id: 3, hospital_id: 1, slot_id: 2, status_id: 4, status_name: 'Completed', status_color: '#6B7280', appointment_date: date(-4), start_time: '14:00:00', end_time: '14:30:00', reason: 'Follow-up consultation', consultation_type: 'In-person', notes: null, cancellation_reason: null, doctor_first_name: 'Rahul', doctor_last_name: 'Sharma', doctor_avatar: null, patient_first_name: 'Aarav', patient_last_name: 'Mehta', patient_avatar: null, hospital_name: 'City Care Hospital' },
  ];
  if (path.includes('/hospitals/admin/all')) return [];
  if (/\/hospitals\/\d+$/.test(path)) return { id: 1, hospital_name: 'City Care Hospital', doctors: [], departments: [] };
  if (path.includes('/hospitals')) return [];
  if (path.includes('/users')) return [
    { id: 1, first_name: 'Demo', last_name: 'Admin', email: 'admin.demo@mediconnect.test', roles: ['super_admin'], is_active: 1 },
    { id: 2, first_name: 'Aarav', last_name: 'Mehta', email: 'patient.demo@mediconnect.test', roles: ['patient'], is_active: 1 },
    { id: 3, first_name: 'Rahul', last_name: 'Sharma', email: 'doctor.demo@mediconnect.test', roles: ['doctor'], is_active: 1 },
    { id: 4, first_name: 'Priya', last_name: 'Kapoor', email: 'hospital.demo@mediconnect.test', roles: ['hospital_admin'], is_active: 1 },
  ];
  if (path.includes('/doctors/my-profile/slots') || path.includes('/doctors/my-leaves') || path.includes('/doctors/my-blocked-slots') || path.includes('/doctors/my-patients')) return [];
  if (path.includes('/doctors')) return [];
  if (path.includes('/reports')) return [];
  if (path.includes('/hospital-manage')) return [];
  return [];
}

function isDemoSession() {
  if (typeof window === 'undefined') return false;
  try {
    return JSON.parse(window.localStorage.getItem('auth-storage') || '{}')?.state?.isDemo === true;
  } catch {
    return false;
  }
}

// Get base URL from env or fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (isDemoSession()) {
      config.adapter = async (demoConfig) => ({
        data: { success: true, data: demoDataFor(demoConfig.url || '', (demoConfig.method || 'get').toLowerCase()) },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: demoConfig,
      });
    }
    // You could also add Authorization header here if not using cookies
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (Token expired)
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token
        await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login only if we are not already on auth pages
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path !== '/login' && path !== '/register' && path !== '/') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      }
    }

    // Standardize error format based on backend ApiResponse
    const customError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      errors: error.response?.data?.errors || null,
      status: error.response?.status || 500,
    };

    return Promise.reject(customError);
  }
);

export default api;
