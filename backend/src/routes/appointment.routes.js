const router = require('express').Router();
const appointmentController = require('../modules/appointment/appointment.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createAppointmentSchema, updateAppointmentSchema, rescheduleAppointmentSchema } = require('../validators/appointment.validator');

router.get('/statuses', appointmentController.getAppointmentStatuses);
router.get('/', authenticate, appointmentController.getAppointments);
router.get('/:id', authenticate, appointmentController.getAppointmentById);
router.post('/', authenticate, validate(createAppointmentSchema), appointmentController.createAppointment);
router.put('/:id', authenticate, validate(updateAppointmentSchema), appointmentController.updateAppointment);
router.put('/:id/cancel', authenticate, appointmentController.cancelAppointment);
router.post('/:id/reschedule', authenticate, validate(rescheduleAppointmentSchema), appointmentController.rescheduleAppointment);

module.exports = router;
