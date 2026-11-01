const router = require('express').Router();
const controller = require('../modules/hospital/hospital-manage.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const pool = require('../database/connection');
const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware to resolve the hospital_id from the authenticated hospital_admin user
 */
const resolveHospitalId = async (req, res, next) => {
  try {
    const [admins] = await pool.query(
      'SELECT hospital_id FROM hospital_admin WHERE user_id = ?',
      [req.user.id]
    );
    if (admins.length === 0) {
      return ApiResponse.forbidden(res, 'You are not assigned to any hospital');
    }
    req.hospitalId = admins[0].hospital_id;
    next();
  } catch (error) {
    next(error);
  }
};

// All routes require authentication + hospital_admin role + hospitalId resolution
router.use(authenticate, requireRole('hospital_admin'), resolveHospitalId);

// Department routes
router.get('/departments', controller.getDepartments);
router.post('/departments', controller.createDepartment);
router.put('/departments/:id', controller.updateDepartment);
router.delete('/departments/:id', controller.deleteDepartment);

// Doctor routes
router.get('/doctors', controller.getDoctors);
router.post('/doctors', controller.createDoctor);
router.put('/doctors/:id', controller.updateDoctor);
router.put('/doctors/:id/activate', controller.activateDoctor);
router.delete('/doctors/:id', controller.deleteDoctor);

// Specialties (read-only)
router.get('/specialties', controller.getSpecialties);

// Appointment routes
router.get('/appointments', controller.getAppointments);
router.get('/appointments/stats', controller.getAppointmentStats);
router.put('/appointments/:id/status', controller.updateAppointmentStatus);

// Leave Management routes
router.get('/leaves', controller.getDoctorLeaves);
router.put('/leaves/:id/status', controller.updateDoctorLeaveStatus);

module.exports = router;
