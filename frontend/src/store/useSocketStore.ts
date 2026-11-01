import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (token: string, hospitalId?: number) => void;
  disconnect: () => void;
  subscribeToHospital: (hospitalId: number) => void;
  unsubscribeFromHospital: (hospitalId: number) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (token: string, hospitalId?: number) => {
    if (get().socket?.connected) return;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') 
      : 'http://localhost:5000';

    const socket = io(backendUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      set({ isConnected: true, socket });
      if (hospitalId) {
        socket.emit('join_hospital', hospitalId);
      }
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Global event listeners for notifications
    socket.on('appointment_new', (data) => {
      // Play a subtle sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio play failed:', e));
      } catch(e) {}
      
      toast.success('New Appointment Booked', {
        description: 'A new appointment has been scheduled.',
        duration: 5000,
      });
    });

    socket.on('appointment_updated', (data) => {
      toast.info('Appointment Status Changed', {
        description: 'An appointment status has been updated.',
      });
    });

    socket.on('appointment_cancelled', (data) => {
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio play failed:', e));
      } catch(e) {}
      
      toast.error('Appointment Cancelled', {
        description: data.reason || 'An appointment has been cancelled.',
        duration: 6000,
      });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  subscribeToHospital: (hospitalId: number) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('join_hospital', hospitalId);
    }
  },

  unsubscribeFromHospital: (hospitalId: number) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('leave_hospital', hospitalId);
    }
  },
}));
