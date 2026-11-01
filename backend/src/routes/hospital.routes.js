const router = require('express').Router();
const hospitalController = require('../modules/hospital/hospital.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createHospitalSchema, updateHospitalSchema, createDepartmentSchema } = require('../validators/hospital.validator');

router.get('/', hospitalController.getAllHospitals);
router.get('/nearby', hospitalController.getNearbyHospitals);
router.get('/specialties', hospitalController.getSpecialties);
router.get('/admin/all', authenticate, requireRole('super_admin'), hospitalController.getAdminHospitals);
router.get('/:id', hospitalController.getHospitalById);
router.post('/', authenticate, requireRole('super_admin'), validate(createHospitalSchema), hospitalController.createHospital);
router.put('/:id', authenticate, requireRole('super_admin', 'hospital_admin'), validate(updateHospitalSchema), hospitalController.updateHospital);
router.put('/:id/status', authenticate, requireRole('super_admin'), hospitalController.updateHospitalStatus);
router.delete('/:id', authenticate, requireRole('super_admin'), hospitalController.deleteHospital);

// Departments
router.get('/:hospitalId/departments', hospitalController.getDepartments);
router.post('/:hospitalId/departments', authenticate, requireRole('super_admin', 'hospital_admin'), validate(createDepartmentSchema), hospitalController.createDepartment);

// Reviews
router.post('/:id/reviews', authenticate, requireRole('patient'), hospitalController.addHospitalReview);

module.exports = router;
