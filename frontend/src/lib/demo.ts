import type { User } from '@/store/authStore';

export type DemoRole = 'patient' | 'doctor' | 'hospital_admin' | 'super_admin';

export const demoUsers: Record<DemoRole, User> = {
  patient: {
    id: 2,
    email: 'patient.demo@mediconnect.test',
    firstName: 'Smruti',
    lastName: 'Mehta',
    roles: ['patient'],
    firstLoginCompleted: true,
    patient: { patient_id: 2 },
  },
  doctor: {
    id: 3,
    email: 'doctor.demo@mediconnect.test',
    firstName: 'Rahul',
    lastName: 'Sharma',
    roles: ['doctor'],
    firstLoginCompleted: true,
    doctor: { doctor_id: 3, hospital_id: 1 },
  },
  hospital_admin: {
    id: 4,
    email: 'hospital.demo@mediconnect.test',
    firstName: 'Priya',
    lastName: 'Kapoor',
    roles: ['hospital_admin'],
    firstLoginCompleted: true,
    hospitalAdmin: {
      hospital_id: 1,
      hospital_name: 'City Care Hospital',
      hospital_is_verified: 1,
      hospital_is_active: 1,
    },
  },
  super_admin: {
    id: 1,
    email: 'admin.demo@mediconnect.test',
    firstName: 'Demo',
    lastName: 'Admin',
    roles: ['super_admin'],
    firstLoginCompleted: true,
  },
};

export const demoRoleLabels: Record<DemoRole, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  hospital_admin: 'Hospital Admin',
  super_admin: 'Super Admin',
};

export const demoDashboardPath = (role: DemoRole) =>
  role === 'super_admin' ? '/admin' : role === 'hospital_admin' ? '/hospital' : `/${role}`;
