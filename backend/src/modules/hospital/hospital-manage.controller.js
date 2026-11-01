const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../../database/connection');
const ApiResponse = require('../../utils/apiResponse');
const { logAudit } = require('../../utils/logger');

// ============================================
// DEPARTMENT MANAGEMENT (Hospital Admin)
// ============================================

/**
 * GET /api/hospital-manage/departments
 * List all departments for the admin's hospital
 */
exports.getDepartments = async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const [departments] = await pool.query(
      `SELECT d.*, 
              (SELECT COUNT(*) FROM doctor doc WHERE doc.department_id = d.id AND doc.is_available = TRUE) as doctor_count
       FROM department d 
       WHERE d.hospital_id = ? 
       ORDER BY d.name ASC`,
      [hospitalId]
    );
    return ApiResponse.success(res, departments);
  } catch (error) { next(error); }
};

/**
 * POST /api/hospital-manage/departments
 * Create a new department
 */
exports.createDepartment = async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const { name, description, floorNumber, icon } = req.body;

    if (!name || name.trim().length === 0) {
      return ApiResponse.badRequest(res, 'Department name is required');
    }

    // Check for duplicate department name in this hospital
    const [existing] = await pool.query(
      'SELECT id FROM department WHERE hospital_id = ? AND name = ?',
      [hospitalId, name.trim()]
    );
    if (existing.length > 0) {
      return ApiResponse.conflict(res, 'A department with this name already exists');
    }

    const [result] = await pool.query(
      'INSERT INTO department (hospital_id, name, description, floor_number) VALUES (?, ?, ?, ?)',
      [hospitalId, name.trim(), description || null, floorNumber || null]
    );

    await logAudit(req.user.id, 'CREATE_DEPARTMENT', 'department', result.insertId, null, { name }, req);

    return ApiResponse.created(res, { id: result.insertId, name: name.trim() }, 'Department created successfully');
  } catch (error) { next(error); }
};

/**
 * PUT /api/hospital-manage/departments/:id
 * Update a department
 */
exports.updateDepartment = async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const deptId = req.params.id;
    const { name, description, floorNumber, isActive } = req.body;

    // Verify department belongs to this hospital
    const [dept] = await pool.query('SELECT id FROM department WHERE id = ? AND hospital_id = ?', [deptId, hospitalId]);
    if (dept.length === 0) {
      return ApiResponse.notFound(res, 'Department not found');
    }

    await pool.query(
      `UPDATE department SET name = COALESCE(?, name), description = COALESCE(?, description), 
       floor_number = COALESCE(?, floor_number), is_active = COALESCE(?, is_active) WHERE id = ?`,
      [name, description, floorNumber, isActive, deptId]
    );

    await logAudit(req.user.id, 'UPDATE_DEPARTMENT', 'department', deptId, null, { name }, req);

    return ApiResponse.success(res, null, 'Department updated successfully');
  } catch (error) { next(error); }
};

/**
 * DELETE /api/hospital-manage/departments/:id
 * Soft delete a department
 */
exports.deleteDepartment = async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const deptId = req.params.id;

    // Verify department belongs to this hospital
    const [dept] = await pool.query('SELECT id FROM department WHERE id = ? AND hospital_id = ?', [deptId, hospitalId]);
    if (dept.length === 0) {
      return ApiResponse.notFound(res, 'Department not found');
    }

    // Check if doctors are assigned
    const [doctors] = await pool.query('SELECT COUNT(*) as count FROM doctor WHERE department_id = ? AND is_available = TRUE', [deptId]);
    if (doctors[0].count > 0) {
      return ApiResponse.badRequest(res, `Cannot delete: ${doctors[0].count} doctor(s) are currently assigned to this department`);
    }

    await pool.query('UPDATE department SET is_active = FALSE WHERE id = ?', [deptId]);
    await logAudit(req.user.id, 'DELETE_DEPARTMENT', 'department', deptId, null, null, req);

    return ApiResponse.success(res, null, 'Department deleted successfully');
  } catch (error) { next(error); }
};


// ============================================
// DOCTOR MANAGEMENT (Hospital Admin)
// ============================================

/**
 * GET /api/hospital-manage/doctors
 * List all doctors for the admin's hospital
 */
exports.getDoctors = async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const [doctors] = await pool.query(
      `SELECT d.id, d.user_id, d.department_id, d.license_number, d.qualification,
              d.experience_years, d.consultation_fee, d.bio, d.is_available, d.rating,
              u.first_name, u.last_name, u.email, u.phone, u.avatar_url, u.first_login_completed, u.is_active,
              dep.name as department_name,
              GROUP_CONCAT(DISTINCT s.name SEPARATOR ', ') as specialties
       FROM doctor d
       JOIN user u ON d.user_id = u.id
       LEFT JOIN department dep ON d.department_id = dep.id
       LEFT JOIN doctor_specialty ds ON d.id = ds.doctor_id
       LEFT JOIN specialty s ON ds.specialty_id = s.id
       WHERE d.hospital_id = ?
       GROUP BY d.id
       ORDER BY u.first_name ASC`,
      [hospitalId]
    );
    return ApiResponse.success(res, doctors);
  } catch (error) { next(error); }
};

/**
 * POST /api/hospital-manage/doctors
 * Create a new doctor (also creates user account with temp password)
 */
exports.createDoctor = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const hospitalId = req.hospitalId;
    const {
      firstName, lastName, email, phone,
      departmentId, specialtyIds,
      qualification, experienceYears, consultationFee, bio,
      licenseNumber, maxPatientsPerDay
    } = req.body;

    if (!firstName || !lastName || !email) {
      await connection.rollback();
      return ApiResponse.badRequest(res, 'First name, last name, and email are required');
    }

    // Check if user already exists
    const [existingUser] = await connection.query('SELECT id FROM user WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      await connection.rollback();
      return ApiResponse.conflict(res, 'A user with this email already exists');
    }

    // Verify department belongs to this hospital
    if (departmentId) {
      const [dept] = await connection.query('SELECT id FROM department WHERE id = ? AND hospital_id = ? AND is_active = TRUE', [departmentId, hospitalId]);
      if (dept.length === 0) {
        await connection.rollback();
        return ApiResponse.badRequest(res, 'Selected department does not belong to your hospital');
      }
    }

    // Generate a secure temporary password
    const tempPassword = `MC${crypto.randomBytes(4).toString('hex').toUpperCase()}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Create user account
    const [userResult] = await connection.query(
      `INSERT INTO user (email, password_hash, first_name, last_name, phone, is_active, is_verified, first_login_completed)
       VALUES (?, ?, ?, ?, ?, TRUE, TRUE, FALSE)`,
      [email, passwordHash, firstName, lastName, phone || null]
    );
    const userId = userResult.insertId;

    // Assign doctor role (role_id = 2)
    const [roles] = await connection.query('SELECT id FROM role WHERE name = ?', ['doctor']);
    if (roles.length > 0) {
      await connection.query('INSERT INTO user_role (user_id, role_id) VALUES (?, ?)', [userId, roles[0].id]);
    }

    // Create doctor profile
    const [doctorResult] = await connection.query(
      `INSERT INTO doctor (user_id, hospital_id, department_id, license_number, qualification, experience_years, consultation_fee, bio, max_patients_per_day, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [userId, hospitalId, departmentId || null, licenseNumber || null, qualification || null, experienceYears || 0, consultationFee || 0, bio || null, maxPatientsPerDay || 20]
    );
    const doctorId = doctorResult.insertId;

    // Link specialties
    if (specialtyIds && specialtyIds.length > 0) {
      for (let i = 0; i < specialtyIds.length; i++) {
        await connection.query(
          'INSERT INTO doctor_specialty (doctor_id, specialty_id, is_primary) VALUES (?, ?, ?)',
          [doctorId, specialtyIds[i], i === 0]
        );
      }
    }

    await connection.commit();

    await logAudit(req.user.id, 'CREATE_DOCTOR', 'doctor', doctorId, null, { email, firstName, lastName }, req);

    return ApiResponse.created(res, {
      doctorId,
      userId,
      email,
      tempPassword,
      loginUrl: '/login'
    }, 'Doctor account created successfully');

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * PUT /api/hospital-manage/doctors/:id
 * Update doctor profile
 */
exports.updateDoctor = async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const doctorId = req.params.id;
    const {
      firstName, lastName, phone,
      departmentId, specialtyIds,
      qualification, experienceYears, consultationFee, bio,
      licenseNumber, isAvailable, maxPatientsPerDay
    } = req.body;

    // Verify doctor belongs to this hospital
    const [doc] = await pool.query('SELECT d.id, d.user_id FROM doctor d WHERE d.id = ? AND d.hospital_id = ?', [doctorId, hospitalId]);
    if (doc.length === 0) {
      return ApiResponse.notFound(res, 'Doctor not found in your hospital');
    }

    const userId = doc[0].user_id;

    // Update user details
    await pool.query(
      'UPDATE user SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), phone = COALESCE(?, phone) WHERE id = ?',
      [firstName, lastName, phone, userId]
    );

    // Update doctor details
    await pool.query(
      `UPDATE doctor SET department_id = COALESCE(?, department_id), license_number = COALESCE(?, license_number),
       qualification = COALESCE(?, qualification), experience_years = COALESCE(?, experience_years),
       consultation_fee = COALESCE(?, consultation_fee), bio = COALESCE(?, bio),
       is_available = COALESCE(?, is_available), max_patients_per_day = COALESCE(?, max_patients_per_day)
       WHERE id = ?`,
      [departmentId, licenseNumber, qualification, experienceYears, consultationFee, bio, isAvailable, maxPatientsPerDay, doctorId]
    );

    // Update specialties if provided
    if (specialtyIds && Array.isArray(specialtyIds)) {
      await pool.query('DELETE FROM doctor_specialty WHERE doctor_id = ?', [doctorId]);
      for (let i = 0; i < specialtyIds.length; i++) {
        await pool.query(
          'INSERT INTO doctor_specialty (doctor_id, specialty_id, is_primary) VALUES (?, ?, ?)',
          [doctorId, specialtyIds[i], i === 0]
        );
      }
    }

    return ApiResponse.success(res, null, 'Doctor updated successfully');
  } catch (error) { next(error); }
};

/**
 * DELETE /api/hospital-manage/doctors/:id
 * Deactivate a doctor
 */
exports.deleteDoctor = async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const doctorId = req.params.id;

    const [doc] = await pool.query('SELECT user_id FROM doctor WHERE id = ? AND hospital_id = ?', [doctorId, hospitalId]);
    if (doc.length === 0) {
      return ApiResponse.notFound(res, 'Doctor not found in your hospital');
    }

    await pool.query('UPDATE doctor SET is_available = FALSE WHERE id = ?', [doctorId]);
    await pool.query('UPDATE user SET is_active = FALSE WHERE id = ?', [doc[0].user_id]);

    await logAudit(req.user.id, 'DELETE_DOCTOR', 'doctor', doctorId, null, null, req);

    return ApiResponse.success(res, null, 'Doctor deactivated successfully');
  } catch (error) { next(error); }
};

/**
 * PUT /api/hospital-manage/doctors/:id/activate
 * Reactivate a doctor
 */
exports.activateDoctor = async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const doctorId = req.params.id;

    const [doc] = await pool.query('SELECT user_id FROM doctor WHERE id = ? AND hospital_id = ?', [doctorId, hospitalId]);
    if (doc.length === 0) {
      return ApiResponse.notFound(res, 'Doctor not found in your hospital');
    }

    await pool.query('UPDATE doctor SET is_available = TRUE WHERE id = ?', [doctorId]);
    await pool.query('UPDATE user SET is_active = TRUE WHERE id = ?', [doc[0].user_id]);

    await logAudit(req.user.id, 'ACTIVATE_DOCTOR', 'doctor', doctorId, null, null, req);

    return ApiResponse.success(res, null, 'Doctor reactivated successfully');
  } catch (error) { next(error); }
};

/**
 * GET /api/hospital-manage/specialties
 * List all specialties
 */
exports.getSpecialties = async (req, res, next) => {
  try {
    const [specs] = await pool.query('SELECT * FROM specialty ORDER BY name ASC');
    return ApiResponse.success(res, specs);
  } catch (error) { next(error); }
};


// ============================================
// APPOINTMENT MANAGEMENT (Hospital Admin)
// ============================================

/**
 * GET /api/hospital-manage/appointments
 * List all appointments for the admin's hospital with filters
 */
exports.getAppointments = async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const { status, date, doctorId, departmentId, search } = req.query;

    let where = 'a.hospital_id = ?';
    const params = [hospitalId];

    if (status && status !== 'all') { where += ' AND ast.name = ?'; params.push(status); }
    if (date) { where += ' AND a.appointment_date = ?'; params.push(date); }
    if (doctorId) { where += ' AND a.doctor_id = ?'; params.push(doctorId); }
    if (departmentId) { where += ' AND d.department_id = ?'; params.push(departmentId); }
    if (search) {
      where += ' AND (pu.first_name LIKE ? OR pu.last_name LIKE ? OR du.first_name LIKE ? OR du.last_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const [appointments] = await pool.query(
      `SELECT a.id, a.appointment_date, a.start_time, a.end_time, a.reason, a.notes,
              a.consultation_type, a.cancellation_reason, a.created_at,
              ast.id as status_id, ast.name as status_name, ast.color as status_color,
              du.first_name as doctor_first_name, du.last_name as doctor_last_name, du.avatar_url as doctor_avatar,
              pu.first_name as patient_first_name, pu.last_name as patient_last_name, pu.phone as patient_phone, pu.email as patient_email,
              dep.name as department_name
       FROM appointment a
       JOIN appointment_status ast ON a.status_id = ast.id
       JOIN doctor d ON a.doctor_id = d.id JOIN user du ON d.user_id = du.id
       JOIN patient p ON a.patient_id = p.id JOIN user pu ON p.user_id = pu.id
       LEFT JOIN department dep ON d.department_id = dep.id
       WHERE ${where}
       ORDER BY a.appointment_date DESC, a.start_time DESC
       LIMIT 200`,
      params
    );

    return ApiResponse.success(res, appointments);
  } catch (error) { next(error); }
};

/**
 * GET /api/hospital-manage/appointments/stats
 * Get appointment statistics for the hospital
 */
exports.getAppointmentStats = async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;

    const [total] = await pool.query('SELECT COUNT(*) as count FROM appointment WHERE hospital_id = ?', [hospitalId]);
    const [today] = await pool.query('SELECT COUNT(*) as count FROM appointment WHERE hospital_id = ? AND appointment_date = CURDATE()', [hospitalId]);
    const [pending] = await pool.query('SELECT COUNT(*) as count FROM appointment WHERE hospital_id = ? AND status_id = 1', [hospitalId]);
    const [confirmed] = await pool.query('SELECT COUNT(*) as count FROM appointment WHERE hospital_id = ? AND status_id = 2', [hospitalId]);
    const [completed] = await pool.query('SELECT COUNT(*) as count FROM appointment WHERE hospital_id = ? AND status_id = 4', [hospitalId]);
    const [cancelled] = await pool.query('SELECT COUNT(*) as count FROM appointment WHERE hospital_id = ? AND status_id = 5', [hospitalId]);

    return ApiResponse.success(res, {
      total: total[0].count,
      today: today[0].count,
      pending: pending[0].count,
      confirmed: confirmed[0].count,
      completed: completed[0].count,
      cancelled: cancelled[0].count,
    });
  } catch (error) { next(error); }
};

/**
 * PUT /api/hospital-manage/appointments/:id/status
 * Update appointment status (approve, cancel, complete)
 */
exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const apptId = req.params.id;
    const { statusId, notes, cancellationReason } = req.body;

    // Verify appointment belongs to this hospital
    const [appt] = await pool.query('SELECT id FROM appointment WHERE id = ? AND hospital_id = ?', [apptId, hospitalId]);
    if (appt.length === 0) {
      return ApiResponse.notFound(res, 'Appointment not found');
    }

    const updates = [];
    const params = [];

    if (statusId) { updates.push('status_id = ?'); params.push(statusId); }
    if (notes) { updates.push('notes = ?'); params.push(notes); }
    if (cancellationReason) {
      updates.push('cancellation_reason = ?', 'cancelled_by = ?');
      params.push(cancellationReason, req.user.id);
    }

    if (updates.length === 0) return ApiResponse.badRequest(res, 'No updates provided');

    params.push(apptId);
    await pool.query(`UPDATE appointment SET ${updates.join(', ')} WHERE id = ?`, params);

    await logAudit(req.user.id, 'UPDATE_APPOINTMENT_STATUS', 'appointment', apptId, null, { statusId }, req);

    return ApiResponse.success(res, null, 'Appointment updated successfully');
  } catch (error) { next(error); }
};

// ============================================
// LEAVE MANAGEMENT (Hospital Admin)
// ============================================

exports.getDoctorLeaves = async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    
    const [leaves] = await pool.query(
      `SELECT dl.*, d.user_id as doctor_user_id, u.first_name, u.last_name 
       FROM doctor_leave dl 
       JOIN doctor d ON dl.doctor_id = d.id 
       JOIN user u ON d.user_id = u.id 
       WHERE d.hospital_id = ? 
       ORDER BY dl.created_at DESC`,
      [hospitalId]
    );
    
    return ApiResponse.success(res, leaves);
  } catch (error) { next(error); }
};

exports.updateDoctorLeaveStatus = async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const leaveId = req.params.id;
    const { status, adminComment } = req.body;
    
    const [leave] = await pool.query('SELECT d.user_id, d.hospital_id FROM doctor_leave dl JOIN doctor d ON dl.doctor_id = d.id WHERE dl.id = ?', [leaveId]);
    if (leave.length === 0 || leave[0].hospital_id !== hospitalId) {
      return ApiResponse.notFound(res, 'Leave request not found');
    }
    
    await pool.query(
      'UPDATE doctor_leave SET status = ?, admin_comment = ? WHERE id = ?',
      [status, adminComment || null, leaveId]
    );
    
    // Notify doctor
    await require('../../utils/notification.util').createNotification(
      leave[0].user_id, 
      'Leave Request Updated', 
      `Your leave request has been ${status}. ${adminComment ? 'Reason: ' + adminComment : ''}`, 
      'leave', 'leave', leaveId
    );
    
    return ApiResponse.success(res, null, 'Leave status updated');
  } catch (error) { next(error); }
};
