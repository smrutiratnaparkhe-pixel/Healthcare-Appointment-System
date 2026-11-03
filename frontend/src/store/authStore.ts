import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { demoUsers, type DemoRole } from '@/lib/demo';

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
  isDemo: boolean;
  setUser: (user: User | null) => void;
  startDemo: (role: DemoRole) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isDemo: false,
      
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false, isDemo: false }),
      startDemo: (role) => set({ user: demoUsers[role], isAuthenticated: true, isLoading: false, isDemo: true }),
      
      checkAuth: async () => {
        const currentState = useAuthStore.getState();
        if (currentState.isDemo) {
          const demoRole = currentState.user?.roles.find((role): role is DemoRole => role in demoUsers);
          set({ user: demoRole ? demoUsers[demoRole] : currentState.user, isLoading: false });
          return;
        }
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
          set({ user: null, isAuthenticated: false, isLoading: false, isDemo: false });
        }
      },
      
      logout: async () => {
        try {
          if (!useAuthStore.getState().isDemo) await api.post('/auth/logout');
        } catch (error) {
          console.error('Logout failed:', error);
        } finally {
          set({ user: null, isAuthenticated: false, isLoading: false, isDemo: false });
          // Force reload to clear all states
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated, isDemo: state.isDemo }),
    }
  )
);
