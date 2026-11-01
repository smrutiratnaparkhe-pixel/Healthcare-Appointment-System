const pool = require('../../database/connection');
const ApiResponse = require('../../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');
const { uploadFile, deleteFile, getSignedUrl } = require('../../supabase/storage');

exports.getAllDoctors = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
    const { search, specialty, hospitalId, city } = req.query;
    let where = 'd.is_available = TRUE';
    const params = [];

    if (search) { where += ' AND (u.first_name LIKE ? OR u.last_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (specialty) { where += ' AND s.name = ?'; params.push(specialty); }
    if (hospitalId) { where += ' AND d.hospital_id = ?'; params.push(hospitalId); }
    if (city) { where += ' AND h.city = ?'; params.push(city); }

    const [countRes] = await pool.query(
      `SELECT COUNT(DISTINCT d.id) as total FROM doctor d
       JOIN user u ON d.user_id = u.id LEFT JOIN hospital h ON d.hospital_id = h.id
       LEFT JOIN doctor_specialty ds ON d.id = ds.doctor_id LEFT JOIN specialty s ON ds.specialty_id = s.id
       WHERE ${where} AND u.is_active = TRUE`, params
    );

    const [doctors] = await pool.query(
      `SELECT d.id, d.user_id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
              d.qualification, d.experience_years, d.consultation_fee, d.bio, d.rating, d.total_reviews,
              d.is_available, d.max_patients_per_day, h.id as hospital_id, h.name as hospital_name,
              h.city as hospital_city, dep.name as department_name,
              GROUP_CONCAT(DISTINCT s.name) as specialties
       FROM doctor d JOIN user u ON d.user_id = u.id
       LEFT JOIN hospital h ON d.hospital_id = h.id LEFT JOIN department dep ON d.department_id = dep.id
       LEFT JOIN doctor_specialty ds ON d.id = ds.doctor_id LEFT JOIN specialty s ON ds.specialty_id = s.id
       WHERE ${where} AND u.is_active = TRUE GROUP BY d.id ORDER BY d.rating DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return ApiResponse.paginated(res, doctors, getPaginationMeta(countRes[0].total, page, limit));
  } catch (error) { next(error); }
};

exports.getDoctorById = async (req, res, next) => {
  try {
    const [doctors] = await pool.query(
      `SELECT d.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
              h.name as hospital_name, h.city as hospital_city, dep.name as department_name,
              GROUP_CONCAT(DISTINCT s.name) as specialties
       FROM doctor d JOIN user u ON d.user_id = u.id
       LEFT JOIN hospital h ON d.hospital_id = h.id LEFT JOIN department dep ON d.department_id = dep.id
       LEFT JOIN doctor_specialty ds ON d.id = ds.doctor_id LEFT JOIN specialty s ON ds.specialty_id = s.id
       WHERE d.id = ? GROUP BY d.id`, [req.params.id]
    );
    if (doctors.length === 0) return ApiResponse.notFound(res, 'Doctor not found');

    const [slots] = await pool.query(
      'SELECT * FROM availability_slot WHERE doctor_id = ? AND is_active = TRUE ORDER BY day_of_week, start_time',
      [req.params.id]
    );

    const [reviews] = await pool.query(
      `SELECT r.*, u.first_name, u.last_name FROM review r
       JOIN patient p ON r.patient_id = p.id JOIN user u ON p.user_id = u.id
       WHERE r.doctor_id = ? AND r.is_visible = TRUE ORDER BY r.created_at DESC LIMIT 10`,
      [req.params.id]
    );

    return ApiResponse.success(res, { ...doctors[0], slots, reviews });
  } catch (error) { next(error); }
};

exports.updateDoctor = async (req, res, next) => {
  try {
    const { qualification, experienceYears, consultationFee, bio, isAvailable, maxPatientsPerDay } = req.body;
    const doctorId = req.params.id;

    const [doc] = await pool.query('SELECT user_id FROM doctor WHERE id = ?', [doctorId]);
    if (doc.length === 0) return ApiResponse.notFound(res, 'Doctor not found');
    if (doc[0].user_id !== req.user.id && !req.user.roles.includes('super_admin') && !req.user.roles.includes('hospital_admin')) {
      return ApiResponse.forbidden(res);
    }

    await pool.query(
      `UPDATE doctor SET qualification = COALESCE(?, qualification), experience_years = COALESCE(?, experience_years),
       consultation_fee = COALESCE(?, consultation_fee), bio = COALESCE(?, bio),
       is_available = COALESCE(?, is_available), max_patients_per_day = COALESCE(?, max_patients_per_day) WHERE id = ?`,
      [qualification, experienceYears, consultationFee, bio, isAvailable, maxPatientsPerDay, doctorId]
    );
    return ApiResponse.success(res, null, 'Doctor profile updated');
  } catch (error) { next(error); }
};

exports.getDoctorSlots = async (req, res, next) => {
  try {
    const [slots] = await pool.query(
      'SELECT * FROM availability_slot WHERE doctor_id = ? AND is_active = TRUE ORDER BY day_of_week, start_time',
      [req.params.id]
    );
    return ApiResponse.success(res, slots);
  } catch (error) { next(error); }
};

exports.getDoctorBlockedSlots = async (req, res, next) => {
  try {
    const [slots] = await pool.query(
      'SELECT * FROM blocked_slot WHERE doctor_id = ? ORDER BY block_date, start_time',
      [req.params.id]
    );
    return ApiResponse.success(res, slots);
  } catch (error) { next(error); }
};

exports.getDoctorBookedAppointments = async (req, res, next) => {
  try {
    const [appointments] = await pool.query(
      `SELECT a.appointment_date as block_date, a.start_time, a.end_time 
       FROM appointment a
       JOIN appointment_status ast ON a.status_id = ast.id
       WHERE a.doctor_id = ? AND ast.name NOT IN ('cancelled', 'rescheduled')`,
      [req.params.id]
    );
    return ApiResponse.success(res, appointments);
  } catch (error) { next(error); }
};

exports.getMySlots = async (req, res, next) => {
  try {
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    const [slots] = await pool.query(
      'SELECT * FROM availability_slot WHERE doctor_id = ? AND is_active = TRUE ORDER BY day_of_week, start_time',
      [doc[0].id]
    );
    return ApiResponse.success(res, slots);
  } catch (error) { next(error); }
};

exports.createSlot = async (req, res, next) => {
  try {
    const { dayOfWeek, startTime, endTime, slotDuration, maxBookings, effectiveFrom, effectiveUntil } = req.body;
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res, 'Only doctors can create slots');

    const doctorId = doc[0].id;
    const [conflict] = await pool.query(
      `SELECT id FROM availability_slot WHERE doctor_id = ? AND day_of_week = ? AND is_active = TRUE
       AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?))`,
      [doctorId, dayOfWeek, endTime, startTime, endTime, startTime]
    );
    if (conflict.length > 0) return ApiResponse.conflict(res, 'Time slot conflicts with existing slot');

    const [result] = await pool.query(
      `INSERT INTO availability_slot (doctor_id, day_of_week, start_time, end_time, slot_duration, max_bookings, effective_from, effective_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [doctorId, dayOfWeek, startTime, endTime, slotDuration || 30, maxBookings || 1, effectiveFrom || null, effectiveUntil || null]
    );
    return ApiResponse.created(res, { id: result.insertId }, 'Slot created');
  } catch (error) { next(error); }
};

exports.deleteSlot = async (req, res, next) => {
  try {
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    await pool.query('UPDATE availability_slot SET is_active = FALSE WHERE id = ? AND doctor_id = ?', [req.params.slotId, doc[0].id]);
    return ApiResponse.success(res, null, 'Slot removed');
  } catch (error) { next(error); }
};

exports.saveSchedule = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { schedule } = req.body;
    const [doc] = await connection.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);

    const doctorId = doc[0].id;
    await connection.beginTransaction();

    // Soft delete existing slots
    await connection.query('UPDATE availability_slot SET is_active = FALSE WHERE doctor_id = ?', [doctorId]);

    // Insert new schedule
    if (schedule && schedule.length > 0) {
      for (const slot of schedule) {
        if (!slot.startTime || !slot.endTime || slot.dayOfWeek === undefined) continue;
        await connection.query(
          `INSERT INTO availability_slot (doctor_id, day_of_week, start_time, end_time, slot_duration, max_bookings)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [doctorId, slot.dayOfWeek, slot.startTime, slot.endTime, slot.slotDuration || 30, slot.maxBookings || 1]
        );
      }
    }

    await connection.commit();
    return ApiResponse.success(res, null, 'Schedule saved successfully');
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

exports.getBlockedSlots = async (req, res, next) => {
  try {
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    const [slots] = await pool.query(
      'SELECT * FROM blocked_slot WHERE doctor_id = ? ORDER BY block_date, start_time',
      [doc[0].id]
    );
    return ApiResponse.success(res, slots);
  } catch (error) { next(error); }
};

exports.createBlockedSlot = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { date, startTime, endTime, reason } = req.body;
    const [doc] = await connection.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO blocked_slot (doctor_id, block_date, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)',
      [doc[0].id, date, startTime, endTime, reason]
    );

    // Cancel any Pending (1) or Confirmed (2) appointments that overlap with this blocked slot
    await connection.query(
      `UPDATE appointment 
       SET status_id = 5, cancellation_reason = ? 
       WHERE doctor_id = ? 
       AND appointment_date = ? 
       AND status_id IN (1, 2) 
       AND start_time < ? AND end_time > ?`,
      [reason || 'Time slot blocked by doctor', doc[0].id, date, endTime, startTime]
    );

    await connection.commit();
    return ApiResponse.created(res, { id: result.insertId }, 'Slot blocked successfully');
  } catch (error) { 
    await connection.rollback();
    next(error); 
  } finally {
    connection.release();
  }
};

exports.deleteBlockedSlot = async (req, res, next) => {
  try {
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    await pool.query('DELETE FROM blocked_slot WHERE id = ? AND doctor_id = ?', [req.params.id, doc[0].id]);
    return ApiResponse.success(res, null, 'Blocked slot removed');
  } catch (error) { next(error); }
};

exports.getMyPatients = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
    const { search, status } = req.query;

    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res, 'Not a doctor');
    const doctorId = doc[0].id;

    let where = '(a.doctor_id = ? OR (ra.doctor_id = ? AND ra.is_revoked = FALSE))';
    const params = [doctorId, doctorId];

    if (search) {
      where += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where += ' AND p.status = ?';
      params.push(status);
    }

    const [countRes] = await pool.query(
      `SELECT COUNT(DISTINCT p.id) as total FROM patient p
       JOIN user u ON p.user_id = u.id
       LEFT JOIN appointment a ON a.patient_id = p.id
       LEFT JOIN medical_report mr ON mr.patient_id = p.id
       LEFT JOIN report_access ra ON ra.report_id = mr.id
       WHERE ${where}`, params
    );

    const [patients] = await pool.query(
      `SELECT DISTINCT p.id, p.status, p.blood_group, u.first_name, u.last_name, u.email, u.phone, u.avatar_url, u.gender, u.date_of_birth,
              (SELECT appointment_date FROM appointment WHERE patient_id = p.id AND doctor_id = ? ORDER BY appointment_date DESC LIMIT 1) as last_visit
       FROM patient p
       JOIN user u ON p.user_id = u.id
       LEFT JOIN appointment a ON a.patient_id = p.id
       LEFT JOIN medical_report mr ON mr.patient_id = p.id
       LEFT JOIN report_access ra ON ra.report_id = mr.id
       WHERE ${where} LIMIT ? OFFSET ?`,
      [doctorId, ...params, limit, offset]
    );

    return ApiResponse.paginated(res, patients, getPaginationMeta(countRes[0].total, page, limit));
  } catch (error) { next(error); }
};

exports.getPatientDetails = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const [patient] = await pool.query(
      `SELECT p.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url, u.gender, u.date_of_birth, u.address_line1, u.city 
       FROM patient p JOIN user u ON p.user_id = u.id WHERE p.id = ?`,
      [patientId]
    );
    if (patient.length === 0) return ApiResponse.notFound(res, 'Patient not found');
    return ApiResponse.success(res, patient[0]);
  } catch (error) { next(error); }
};

exports.updatePatientStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE patient SET status = ? WHERE id = ?', [status, req.params.patientId]);
    return ApiResponse.success(res, null, 'Status updated');
  } catch (error) { next(error); }
};

exports.getPatientHistory = async (req, res, next) => {
  try {
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    const [history] = await pool.query(
      `SELECT a.*, ast.name as status_name, ast.color as status_color 
       FROM appointment a JOIN appointment_status ast ON a.status_id = ast.id 
       WHERE a.patient_id = ? AND a.doctor_id = ? ORDER BY a.appointment_date DESC`,
      [req.params.patientId, doc[0].id]
    );
    return ApiResponse.success(res, history);
  } catch (error) { next(error); }
};

exports.getPatientReports = async (req, res, next) => {
  try {
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    
    // View reports explicitly shared or uploaded by the doctor
    const query = `SELECT DISTINCT mr.*, u.first_name as uploaded_by_name, u.last_name as uploaded_by_last_name, 
                    (SELECT r.name FROM user_role ur JOIN role r ON ur.role_id = r.id WHERE ur.user_id = u.id LIMIT 1) as uploader_role
             FROM medical_report mr
             JOIN user u ON mr.uploaded_by = u.id
             LEFT JOIN report_access ra ON ra.report_id = mr.id
             WHERE mr.patient_id = ? 
               AND (
                 (ra.doctor_id = ? AND ra.is_revoked = FALSE AND (ra.expires_at IS NULL OR ra.expires_at > NOW()))
                 OR mr.uploaded_by = ?
               )
             ORDER BY mr.report_date DESC`;
    const [reports] = await pool.query(query, [req.params.patientId, doc[0].id, req.user.id]);
    return ApiResponse.success(res, reports);
  } catch (error) { next(error); }
};

exports.getPatientNotes = async (req, res, next) => {
  try {
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    const [notes] = await pool.query(
      'SELECT * FROM doctor_patient_note WHERE doctor_id = ? AND patient_id = ? ORDER BY created_at DESC',
      [doc[0].id, req.params.patientId]
    );
    return ApiResponse.success(res, notes);
  } catch (error) { next(error); }
};

exports.addPatientNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    const [result] = await pool.query(
      'INSERT INTO doctor_patient_note (doctor_id, patient_id, note) VALUES (?, ?, ?)',
      [doc[0].id, req.params.patientId, note]
    );
    return ApiResponse.created(res, { id: result.insertId }, 'Note added');
  } catch (error) { next(error); }
};

exports.deletePatientNote = async (req, res, next) => {
  try {
    const { patientId, noteId } = req.params;
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    
    // Ensure the note belongs to this doctor
    const [result] = await pool.query(
      'DELETE FROM doctor_patient_note WHERE id = ? AND doctor_id = ? AND patient_id = ?',
      [noteId, doc[0].id, patientId]
    );
    
    if (result.affectedRows === 0) {
      return ApiResponse.notFound(res, 'Note not found or unauthorized');
    }
    
    return ApiResponse.success(res, null, 'Note deleted');
  } catch (error) { next(error); }
};

// Profile Settings

exports.updateAvailability = async (req, res, next) => {
  try {
    const { isAvailable, emergencyAvailability } = req.body;
    await pool.query(
      'UPDATE doctor SET is_available = COALESCE(?, is_available), emergency_availability = COALESCE(?, emergency_availability) WHERE user_id = ?',
      [isAvailable, emergencyAvailability, req.user.id]
    );
    return ApiResponse.success(res, null, 'Availability updated');
  } catch (error) { next(error); }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    
    const [docs] = await pool.query('SELECT * FROM doctor_document WHERE doctor_id = ? ORDER BY uploaded_at DESC', [doc[0].id]);
    
    // Get signed URLs
    const docsWithUrls = await Promise.all(docs.map(async (d) => {
      try {
        const url = await getSignedUrl(d.file_url, 60); // 1 hour expiry
        return { ...d, url };
      } catch (err) {
        return { ...d, url: null };
      }
    }));
    
    return ApiResponse.success(res, docsWithUrls);
  } catch (error) { next(error); }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return ApiResponse.badRequest(res, 'No file uploaded');
    const { documentType } = req.body;
    if (!['certificate', 'license', 'identity'].includes(documentType)) {
      return ApiResponse.badRequest(res, 'Invalid document type');
    }
    
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    
    const uploaded = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'doctor_docs');
    
    const [result] = await pool.query(
      'INSERT INTO doctor_document (doctor_id, document_type, file_name, file_url) VALUES (?, ?, ?, ?)',
      [doc[0].id, documentType, req.file.originalname, uploaded.storagePath]
    );
    
    return ApiResponse.created(res, { id: result.insertId }, 'Document uploaded');
  } catch (error) { next(error); }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    
    const [docs] = await pool.query('SELECT * FROM doctor_document WHERE id = ? AND doctor_id = ?', [req.params.id, doc[0].id]);
    if (docs.length === 0) return ApiResponse.notFound(res, 'Document not found');
    
    await deleteFile(docs[0].file_url);
    await pool.query('DELETE FROM doctor_document WHERE id = ?', [req.params.id]);
    
    return ApiResponse.success(res, null, 'Document deleted');
  } catch (error) { next(error); }
};

exports.getLeaves = async (req, res, next) => {
  try {
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    
    const [leaves] = await pool.query('SELECT * FROM doctor_leave WHERE doctor_id = ? ORDER BY start_date DESC', [doc[0].id]);
    return ApiResponse.success(res, leaves);
  } catch (error) { next(error); }
};

exports.applyLeave = async (req, res, next) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    
    const [result] = await pool.query(
      'INSERT INTO doctor_leave (doctor_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)',
      [doc[0].id, startDate, endDate, reason]
    );
    return ApiResponse.created(res, { id: result.insertId }, 'Leave applied');
  } catch (error) { next(error); }
};

exports.cancelLeave = async (req, res, next) => {
  try {
    const [doc] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    
    await pool.query('DELETE FROM doctor_leave WHERE id = ? AND doctor_id = ?', [req.params.id, doc[0].id]);
    return ApiResponse.success(res, null, 'Leave cancelled');
  } catch (error) { next(error); }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const [doc] = await pool.query('SELECT id, is_available, emergency_availability FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doc.length === 0) return ApiResponse.forbidden(res);
    const doctorId = doc[0].id;
    
    // Get today's stats
    const [todayAppts] = await pool.query(
      'SELECT status_id, consultation_type FROM appointment WHERE doctor_id = ? AND appointment_date = CURDATE()',
      [doctorId]
    );
    
    // Get total patients (distinct patients this doctor has seen or will see)
    const [patients] = await pool.query(
      'SELECT COUNT(DISTINCT patient_id) as count FROM appointment WHERE doctor_id = ?',
      [doctorId]
    );
    
    // Get total reviews & rating
    const [rating] = await pool.query(
      'SELECT rating, total_reviews FROM doctor WHERE id = ?',
      [doctorId]
    );

    let completed = 0;
    let pending = 0;
    let emergency = 0;
    
    todayAppts.forEach(appt => {
      if (appt.status_id === 4) completed++;
      if (appt.status_id === 1 || appt.status_id === 2) pending++;
      if (appt.consultation_type === 'emergency') emergency++;
    });

    return ApiResponse.success(res, {
      todaysTotal: todayAppts.length,
      completed,
      pending,
      emergency,
      totalPatients: patients[0].count,
      rating: rating[0].rating,
      totalReviews: rating[0].total_reviews,
      isEmergencyEnabled: doc[0].emergency_availability
    });
  } catch (error) { next(error); }
};
