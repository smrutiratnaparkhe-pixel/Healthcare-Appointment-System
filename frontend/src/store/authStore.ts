import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  avatar?: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  address_line1?: string;
  city?: string;
  firstLoginCompleted?: boolean;
  patient?: any;
  doctor?: any;
  hospitalAdmin?: any;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      
      checkAuth: async () => {
        try {
          const response: any = await api.get('/auth/me');
          const d = response.data;
          const mappedUser: User = {
            id: d.id,
            email: d.email,
            firstName: d.first_name || d.firstName || '',
            lastName: d.last_name || d.lastName || '',
            roles: d.roles || [],
            avatar: d.avatar_url || d.avatar || '',
            phone: d.phone || '',
            firstLoginCompleted: d.first_login_completed !== undefined ? Boolean(d.first_login_completed) : true,
            patient: d.patient,
            doctor: d.doctor,
            hospitalAdmin: d.hospitalAdmin,
          };
          set({ user: mappedUser, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
      
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          console.error('Logout failed:', error);
        } finally {
          set({ user: null, isAuthenticated: false, isLoading: false });
          // Force reload to clear all states
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }), // Only persist these
    }
  )
);
