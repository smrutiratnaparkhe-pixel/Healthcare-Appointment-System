const router = require('express').Router();
const analyticsController = require('../modules/analytics/analytics.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/dashboard', authenticate, requireRole('super_admin', 'hospital_admin'), analyticsController.getDashboardStats);
router.get('/appointments/trends', authenticate, requireRole('super_admin', 'hospital_admin', 'doctor'), analyticsController.getAppointmentTrends);
router.get('/doctors/stats', authenticate, requireRole('super_admin', 'hospital_admin'), analyticsController.getDoctorStats);
router.get('/doctors/my-stats', authenticate, requireRole('doctor'), analyticsController.getMyDoctorStats);
router.get('/patients/stats', authenticate, requireRole('super_admin'), analyticsController.getPatientStats);
router.get('/patients/my-stats', authenticate, requireRole('patient'), analyticsController.getMyPatientStats);
router.get('/hospitals/:hospitalId', authenticate, requireRole('super_admin', 'hospital_admin'), analyticsController.getHospitalAnalytics);
router.get('/audit-logs', authenticate, requireRole('super_admin'), analyticsController.getAuditLogs);

module.exports = router;
