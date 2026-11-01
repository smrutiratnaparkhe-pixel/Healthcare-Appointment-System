const pool = require('../../database/connection');
const ApiResponse = require('../../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/logger');
const { createNotification } = require('../../utils/notification.util');
const { emitToHospital, emitToUser } = require('../../socket');

exports.createAppointment = async (req, res, next) => {
  try {
    const { doctorId, hospitalId, slotId, appointmentDate, startTime, endTime, reason, consultationType } = req.body;

    // Get patient id
    let patientId = req.body.patientId;
    if (!patientId) {
      const [patients] = await pool.query('SELECT id FROM patient WHERE user_id = ?', [req.user.id]);
      if (patients.length === 0) return ApiResponse.badRequest(res, 'Patient profile not found or patientId not provided');
      patientId = patients[0].id;
    }

    // Get doctor id
    let docId = doctorId;
    if (!docId) {
      const [doctors] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
      if (doctors.length > 0) docId = doctors[0].id;
    }
    if (!docId) return ApiResponse.badRequest(res, 'Doctor ID is required');

    // Check for approved leaves
    const [leaves] = await pool.query(
      `SELECT id FROM doctor_leave WHERE doctor_id = ? AND status = 'approved' AND ? BETWEEN start_date AND end_date`,
      [docId, appointmentDate]
    );
    if (leaves.length > 0) return ApiResponse.conflict(res, 'Doctor is on leave on this date');

    // Check for blocked slots
    const [blockedSlots] = await pool.query(
      `SELECT id FROM blocked_slot WHERE doctor_id = ? AND block_date = ?
       AND start_time < ? AND end_time > ?`,
      [docId, appointmentDate, endTime, startTime]
    );
    if (blockedSlots.length > 0) return ApiResponse.conflict(res, 'Doctor is unavailable during this time');

    // Check for conflicts
    const [conflicts] = await pool.query(
      `SELECT id FROM appointment WHERE doctor_id = ? AND appointment_date = ?
       AND start_time < ? AND end_time > ? AND status_id NOT IN (5, 7)`,
      [docId, appointmentDate, endTime, startTime]
    );
    if (conflicts.length > 0) return ApiResponse.conflict(res, 'Time slot is already booked');

    // Check patient doesn't have overlapping appointment
    const [patientConflicts] = await pool.query(
      `SELECT id FROM appointment WHERE patient_id = ? AND appointment_date = ?
       AND start_time < ? AND end_time > ? AND status_id NOT IN (5, 7)`,
      [patientId, appointmentDate, endTime, startTime]
    );
    if (patientConflicts.length > 0) return ApiResponse.conflict(res, 'You already have an appointment at this time');

    // Get hospital from doctor if not provided
    let hospId = hospitalId;
    if (!hospId) {
      const [doc] = await pool.query('SELECT hospital_id FROM doctor WHERE id = ?', [docId]);
      if (doc.length > 0) hospId = doc[0].hospital_id;
    }

    const [result] = await pool.query(
      `INSERT INTO appointment (patient_id, doctor_id, hospital_id, slot_id, status_id, appointment_date, start_time, end_time, reason, consultation_type)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
      [patientId, docId, hospId, slotId || null, appointmentDate, startTime, endTime, reason || 'Walk-in Consultation', consultationType || 'in-person']
    );

    // Create notifications
    const [docUser] = await pool.query('SELECT user_id FROM doctor WHERE id = ?', [docId]);
    if (docUser.length > 0) {
      await createNotification(docUser[0].user_id, 'New Appointment', `You have a new appointment on ${appointmentDate}`, 'appointment', 'appointment', result.insertId);
    }
    const [hosp] = await pool.query('SELECT user_id FROM user JOIN hospital_admin ON user.id = hospital_admin.user_id WHERE hospital_admin.hospital_id = ?', [hospId]);
    if (hosp.length > 0) {
      await createNotification(hosp[0].user_id, 'New Appointment Booked', `A new appointment has been booked for ${appointmentDate}`, 'appointment', 'appointment', result.insertId);
    }

    // Socket.io Realtime updates
    emitToHospital(hospId, 'appointment_new', { appointmentId: result.insertId, doctorId: docId, patientId, date: appointmentDate });
    emitToUser(docUser.length > 0 ? docUser[0].user_id : null, 'appointment_new', { appointmentId: result.insertId, date: appointmentDate });

    await logAudit(req.user.id, 'CREATE_APPOINTMENT', 'appointment', result.insertId, null, { docId, appointmentDate }, req);
    return ApiResponse.created(res, { id: result.insertId }, 'Appointment booked successfully');
  } catch (error) { next(error); }
};

exports.getAppointments = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
    const { status, date, doctorId, patientId } = req.query;
    let where = '1=1';
    const params = [];

    // Scope by role
    if (req.user.roles.includes('patient')) {
      const [p] = await pool.query('SELECT id FROM patient WHERE user_id = ?', [req.user.id]);
      if (p.length > 0) { where += ' AND a.patient_id = ?'; params.push(p[0].id); }
    } else if (req.user.roles.includes('doctor')) {
      const [d] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
      if (d.length > 0) { where += ' AND a.doctor_id = ?'; params.push(d[0].id); }
    } else if (req.user.roles.includes('hospital_admin')) {
      const [h] = await pool.query('SELECT hospital_id FROM hospital_admin WHERE user_id = ?', [req.user.id]);
      if (h.length > 0) { where += ' AND a.hospital_id = ?'; params.push(h[0].hospital_id); }
    }

    if (status) { where += ' AND ast.name = ?'; params.push(status); }
    if (date) { where += ' AND a.appointment_date = ?'; params.push(date); }
    if (doctorId && req.user.roles.includes('super_admin')) { where += ' AND a.doctor_id = ?'; params.push(doctorId); }

    const [countRes] = await pool.query(
      `SELECT COUNT(*) as total FROM appointment a JOIN appointment_status ast ON a.status_id = ast.id WHERE ${where}`, params
    );

    const [appointments] = await pool.query(
      `SELECT a.*, ast.name as status_name, ast.color as status_color,
              du.first_name as doctor_first_name, du.last_name as doctor_last_name, du.avatar_url as doctor_avatar,
              pu.first_name as patient_first_name, pu.last_name as patient_last_name,
              h.name as hospital_name,
              EXISTS(SELECT 1 FROM review r WHERE r.appointment_id = a.id) as is_reviewed
       FROM appointment a
       JOIN appointment_status ast ON a.status_id = ast.id
       JOIN doctor d ON a.doctor_id = d.id JOIN user du ON d.user_id = du.id
       JOIN patient p ON a.patient_id = p.id JOIN user pu ON p.user_id = pu.id
       LEFT JOIN hospital h ON a.hospital_id = h.id
       WHERE ${where} ORDER BY a.appointment_date DESC, a.start_time DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return ApiResponse.paginated(res, appointments, getPaginationMeta(countRes[0].total, page, limit));
  } catch (error) { next(error); }
};

exports.getAppointmentById = async (req, res, next) => {
  try {
    const [appts] = await pool.query(
      `SELECT a.*, ast.name as status_name, ast.color as status_color,
              du.first_name as doctor_first_name, du.last_name as doctor_last_name,
              pu.first_name as patient_first_name, pu.last_name as patient_last_name,
              h.name as hospital_name
       FROM appointment a JOIN appointment_status ast ON a.status_id = ast.id
       JOIN doctor d ON a.doctor_id = d.id JOIN user du ON d.user_id = du.id
       JOIN patient p ON a.patient_id = p.id JOIN user pu ON p.user_id = pu.id
       LEFT JOIN hospital h ON a.hospital_id = h.id WHERE a.id = ?`, [req.params.id]
    );
    if (appts.length === 0) return ApiResponse.notFound(res, 'Appointment not found');
    return ApiResponse.success(res, appts[0]);
  } catch (error) { next(error); }
};

exports.updateAppointment = async (req, res, next) => {
  try {
    const { statusId, notes, cancellationReason } = req.body;
    const updates = [];
    const params = [];

    if (statusId) { updates.push('status_id = ?'); params.push(statusId); }
    if (notes) { updates.push('notes = ?'); params.push(notes); }
    if (cancellationReason) {
      updates.push('cancellation_reason = ?', 'cancelled_by = ?', 'status_id = 5');
      params.push(cancellationReason, req.user.id);
    }

    if (updates.length === 0) return ApiResponse.badRequest(res, 'No updates provided');
    params.push(req.params.id);
    await pool.query(`UPDATE appointment SET ${updates.join(', ')} WHERE id = ?`, params);

    // Get patient user_id to notify them
    const [appt] = await pool.query('SELECT p.user_id, ast.name as status_name FROM appointment a JOIN patient p ON a.patient_id = p.id JOIN appointment_status ast ON a.status_id = ast.id WHERE a.id = ?', [req.params.id]);
    if (appt.length > 0) {
      if (statusId) {
        await createNotification(appt[0].user_id, 'Appointment Status Updated', `Your appointment status is now ${appt[0].status_name}`, 'appointment', 'appointment', req.params.id);
      }
      if (cancellationReason) {
         await createNotification(appt[0].user_id, 'Appointment Cancelled', `Your appointment was cancelled: ${cancellationReason}`, 'appointment', 'appointment', req.params.id);
      }
      
      // Socket.io Realtime updates
      emitToUser(appt[0].user_id, 'appointment_updated', { appointmentId: req.params.id, statusId, cancellationReason });
    }

    return ApiResponse.success(res, null, 'Appointment updated');
  } catch (error) { next(error); }
};

exports.cancelAppointment = async (req, res, next) => {
  try {
    const { reason } = req.body;
    await pool.query(
      'UPDATE appointment SET status_id = 5, cancellation_reason = ?, cancelled_by = ? WHERE id = ?',
      [reason || 'Cancelled by user', req.user.id, req.params.id]
    );

    // Notify patient/doctor based on who cancelled
    const [appt] = await pool.query('SELECT p.user_id as patient_user_id, d.user_id as doc_user_id FROM appointment a JOIN patient p ON a.patient_id = p.id JOIN doctor d ON a.doctor_id = d.id WHERE a.id = ?', [req.params.id]);
    if (appt.length > 0) {
      // If user is doctor, notify patient
      if (req.user.roles.includes('doctor') || req.user.roles.includes('hospital_admin') || req.user.roles.includes('super_admin')) {
         await createNotification(appt[0].patient_user_id, 'Appointment Cancelled', `Your appointment was cancelled: ${reason || 'Cancelled by provider'}`, 'appointment', 'appointment', req.params.id);
         emitToUser(appt[0].patient_user_id, 'appointment_cancelled', { appointmentId: req.params.id, reason });
      } else {
         // Notify doctor
         await createNotification(appt[0].doc_user_id, 'Appointment Cancelled', `Patient cancelled the appointment.`, 'appointment', 'appointment', req.params.id);
         emitToUser(appt[0].doc_user_id, 'appointment_cancelled', { appointmentId: req.params.id, reason });
      }
    }

    return ApiResponse.success(res, null, 'Appointment cancelled');
  } catch (error) { next(error); }
};

exports.rescheduleAppointment = async (req, res, next) => {
  try {
    const { appointmentDate, startTime, endTime, slotId } = req.body;
    const oldId = req.params.id;

    // Mark old as rescheduled
    await pool.query('UPDATE appointment SET status_id = 7 WHERE id = ?', [oldId]);

    // Get old appointment data
    const [old] = await pool.query('SELECT * FROM appointment WHERE id = ?', [oldId]);
    if (old.length === 0) return ApiResponse.notFound(res);

    // Check for approved leaves
    const [leaves] = await pool.query(
      `SELECT id FROM doctor_leave WHERE doctor_id = ? AND status = 'approved' AND ? BETWEEN start_date AND end_date`,
      [old[0].doctor_id, appointmentDate]
    );
    if (leaves.length > 0) return ApiResponse.conflict(res, 'Doctor is on leave on this date');

    // Check for blocked slots
    const [blockedSlots] = await pool.query(
      `SELECT id FROM blocked_slot WHERE doctor_id = ? AND block_date = ?
       AND start_time < ? AND end_time > ?`,
      [old[0].doctor_id, appointmentDate, endTime, startTime]
    );
    if (blockedSlots.length > 0) return ApiResponse.conflict(res, 'Doctor is unavailable during this time');

    // Check conflicts
    const [conflicts] = await pool.query(
      `SELECT id FROM appointment WHERE doctor_id = ? AND appointment_date = ?
       AND start_time < ? AND end_time > ? AND status_id NOT IN (5, 7)`,
      [old[0].doctor_id, appointmentDate, endTime, startTime]
    );
    if (conflicts.length > 0) return ApiResponse.conflict(res, 'New time slot is not available');

    const [result] = await pool.query(
      `INSERT INTO appointment (patient_id, doctor_id, hospital_id, slot_id, status_id, appointment_date, start_time, end_time, reason, consultation_type, rescheduled_from)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
      [old[0].patient_id, old[0].doctor_id, old[0].hospital_id, slotId, appointmentDate, startTime, endTime, old[0].reason, old[0].consultation_type, oldId]
    );

    const [appt] = await pool.query('SELECT p.user_id as patient_user_id, d.user_id as doc_user_id FROM appointment a JOIN patient p ON a.patient_id = p.id JOIN doctor d ON a.doctor_id = d.id WHERE a.id = ?', [result.insertId]);
    if (appt.length > 0) {
      await createNotification(appt[0].patient_user_id, 'Appointment Rescheduled', `Your appointment has been rescheduled to ${appointmentDate} ${startTime}`, 'appointment', 'appointment', result.insertId);
      await createNotification(appt[0].doc_user_id, 'Appointment Rescheduled', `An appointment was rescheduled to ${appointmentDate} ${startTime}`, 'appointment', 'appointment', result.insertId);
    }

    return ApiResponse.created(res, { id: result.insertId }, 'Appointment rescheduled');
  } catch (error) { next(error); }
};

exports.getAppointmentStatuses = async (req, res, next) => {
  try {
    const [statuses] = await pool.query('SELECT * FROM appointment_status');
    return ApiResponse.success(res, statuses);
  } catch (error) { next(error); }
};
