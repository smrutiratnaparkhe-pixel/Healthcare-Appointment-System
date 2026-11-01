"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Don't render anything until auth state is determined
  // In a real app you might show a full screen spinner here,
  // but to prevent flash on public routes we render children if not loading,
  // or handle protection in layout/middleware
  
  return <>{children}</>;
}
