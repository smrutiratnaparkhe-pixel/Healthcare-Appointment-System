const { z } = require('zod');

const createHospitalSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Hospital name is required').max(255),
    description: z.string().max(2000).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    website: z.string().url().optional().or(z.literal('')),
    addressLine1: z.string().min(1, 'Address is required').max(255),
    addressLine2: z.string().max(255).optional(),
    city: z.string().min(1, 'City is required').max(100),
    state: z.string().min(1, 'State is required').max(100),
    zipCode: z.string().max(20).optional(),
    registrationNumber: z.string().max(100).optional(),
    establishedYear: z.number().int().optional(),
    bedCount: z.number().int().min(0).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),
});

const updateHospitalSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(255).optional(),
    description: z.string().max(2000).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    website: z.string().url().optional().or(z.literal('')),
    addressLine1: z.string().max(255).optional(),
    addressLine2: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    zipCode: z.string().max(20).optional(),
    bedCount: z.number().int().min(0).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Department name is required').max(100),
    description: z.string().max(500).optional(),
    floorNumber: z.string().max(10).optional(),
  }),
});

const createReviewSchema = z.object({
  body: z.object({
    doctorId: z.number().int().positive('Doctor ID is required'),
    appointmentId: z.number().int().positive().optional(),
    rating: z.number().min(1).max(5),
    title: z.string().max(255).optional(),
    comment: z.string().max(2000).optional(),
    isAnonymous: z.boolean().default(false),
  }),
});

const shareReportSchema = z.object({
  body: z.object({
    doctorId: z.number().int().positive('Doctor ID is required'),
    accessType: z.enum(['view', 'download']).default('view'),
    expiresInDays: z.number().int().min(1).max(30).default(7),
  }),
});

module.exports = {
  createHospitalSchema,
  updateHospitalSchema,
  createDepartmentSchema,
  createReviewSchema,
  shareReportSchema,
};
