const router = require('express').Router();
const doctorController = require('../modules/doctor/doctor.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createSlotSchema } = require('../validators/appointment.validator');
const upload = require('../middleware/upload');

router.get('/', doctorController.getAllDoctors);
router.get('/my-patients', authenticate, requireRole('doctor'), doctorController.getMyPatients);
router.get('/my-patients/:patientId', authenticate, requireRole('doctor'), doctorController.getPatientDetails);
router.put('/my-patients/:patientId/status', authenticate, requireRole('doctor'), doctorController.updatePatientStatus);
router.get('/my-patients/:patientId/history', authenticate, requireRole('doctor'), doctorController.getPatientHistory);
router.get('/my-patients/:patientId/reports', authenticate, requireRole('doctor'), doctorController.getPatientReports);
router.get('/my-patients/:patientId/notes', authenticate, requireRole('doctor'), doctorController.getPatientNotes);
router.post('/my-patients/:patientId/notes', authenticate, requireRole('doctor'), doctorController.addPatientNote);
router.delete('/my-patients/:patientId/notes/:noteId', authenticate, requireRole('doctor'), doctorController.deletePatientNote);
router.put('/my-profile/availability', authenticate, requireRole('doctor'), doctorController.updateAvailability);
router.get('/my-documents', authenticate, requireRole('doctor'), doctorController.getDocuments);
router.post('/my-documents', authenticate, requireRole('doctor'), upload.single('file'), doctorController.uploadDocument);
router.delete('/my-documents/:id', authenticate, requireRole('doctor'), doctorController.deleteDocument);
router.get('/my-leaves', authenticate, requireRole('doctor'), doctorController.getLeaves);
router.post('/my-leaves', authenticate, requireRole('doctor'), doctorController.applyLeave);
router.delete('/my-leaves/:id', authenticate, requireRole('doctor'), doctorController.cancelLeave);
router.get('/my-dashboard-stats', authenticate, requireRole('doctor'), doctorController.getDashboardStats);

router.get('/my-profile/slots', authenticate, requireRole('doctor'), doctorController.getMySlots);
router.post('/schedule', authenticate, requireRole('doctor'), doctorController.saveSchedule);
router.get('/my-blocked-slots', authenticate, requireRole('doctor'), doctorController.getBlockedSlots);
router.post('/blocked-slots', authenticate, requireRole('doctor'), doctorController.createBlockedSlot);
router.delete('/blocked-slots/:id', authenticate, requireRole('doctor'), doctorController.deleteBlockedSlot);
router.post('/slots', authenticate, requireRole('doctor'), validate(createSlotSchema), doctorController.createSlot);
router.delete('/slots/:slotId', authenticate, requireRole('doctor'), doctorController.deleteSlot);

router.get('/:id', doctorController.getDoctorById);
router.put('/:id', authenticate, requireRole('doctor', 'super_admin', 'hospital_admin'), doctorController.updateDoctor);
router.get('/:id/slots', doctorController.getDoctorSlots);
router.get('/:id/blocked-slots', doctorController.getDoctorBlockedSlots);
router.get('/:id/booked-appointments', doctorController.getDoctorBookedAppointments);

module.exports = router;
