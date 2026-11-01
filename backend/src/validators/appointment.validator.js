const { z } = require('zod');

const createAppointmentSchema = z.object({
  body: z.object({
    patientId: z.number().int().positive().optional(),
    doctorId: z.number().int().positive('Doctor ID is required'),
    hospitalId: z.number().int().positive().optional(),
    slotId: z.number().int().positive().optional(),
    appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM format'),
    endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM format'),
    reason: z.string().max(1000).optional(),
    consultationType: z.enum(['in_person', 'video', 'phone']).default('in_person'),
  }),
});

const updateAppointmentSchema = z.object({
  body: z.object({
    statusId: z.number().int().positive().optional(),
    notes: z.string().max(2000).optional(),
    cancellationReason: z.string().max(500).optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

const rescheduleAppointmentSchema = z.object({
  body: z.object({
    appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM format'),
    endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM format'),
    slotId: z.number().int().positive().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

const createSlotSchema = z.object({
  body: z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM format'),
    endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM format'),
    slotDuration: z.number().int().min(10).max(120).default(30),
    maxBookings: z.number().int().min(1).max(50).default(1),
    effectiveFrom: z.string().optional(),
    effectiveUntil: z.string().optional(),
  }),
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentSchema,
  rescheduleAppointmentSchema,
  createSlotSchema,
};
