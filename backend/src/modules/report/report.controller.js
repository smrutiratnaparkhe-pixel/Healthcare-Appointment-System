const pool = require('../../database/connection');
const ApiResponse = require('../../utils/apiResponse');
const { uploadFile, getSignedUrl, deleteFile } = require('../../supabase/storage');
const { logAudit } = require('../../utils/logger');
const { createNotification } = require('../../utils/notification.util');

exports.uploadReport = async (req, res, next) => {
  try {
    if (!req.file) return ApiResponse.badRequest(res, 'No file uploaded');

    const { title, description, reportType, reportDate, appointmentId, sharedDoctorIds, patientId } = req.body;
    let targetPatientId;

    if (req.user.roles.includes('doctor')) {
      if (!patientId) return ApiResponse.badRequest(res, 'patientId is required when uploading as a doctor');
      targetPatientId = patientId;
    } else {
      const [patients] = await pool.query('SELECT id FROM patient WHERE user_id = ?', [req.user.id]);
      if (patients.length === 0) return ApiResponse.forbidden(res, 'Patient profile required');
      targetPatientId = patients[0].id;
    }

    const uploaded = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'reports');

    const [result] = await pool.query(
      `INSERT INTO medical_report (patient_id, appointment_id, title, description, file_name, file_type, file_size, storage_path, report_type, report_date, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [targetPatientId, appointmentId || null, title || req.file.originalname, description, req.file.originalname, req.file.mimetype, req.file.size, uploaded.storagePath, reportType || 'other', reportDate || new Date().toISOString().split('T')[0], req.user.id]
    );

    // Share with requested doctors
    if (sharedDoctorIds) {
      let docIds = [];
      try {
        docIds = JSON.parse(sharedDoctorIds); // because it might come as form-data string
      } catch(e) {
        docIds = Array.isArray(sharedDoctorIds) ? sharedDoctorIds : [sharedDoctorIds];
      }
      
      for (const docId of docIds) {
        await pool.query(
          `INSERT INTO report_access (report_id, doctor_id, granted_by, access_type, expires_at)
           VALUES (?, ?, ?, 'view', DATE_ADD(NOW(), INTERVAL 30 DAY))`,
          [result.insertId, docId, req.user.id]
        );
        const [doc] = await pool.query('SELECT user_id FROM doctor WHERE id = ?', [docId]);
        if (doc.length > 0) {
          await createNotification(doc[0].user_id, 'Report Shared', 'A patient shared a new medical report with you.', 'access', 'medical_report', result.insertId);
        }
      }
    }

    await logAudit(req.user.id, 'UPLOAD_REPORT', 'medical_report', result.insertId, null, { title }, req);
    return ApiResponse.created(res, { id: result.insertId, fileName: req.file.originalname }, 'Report uploaded');
  } catch (error) { next(error); }
};

exports.getMyReports = async (req, res, next) => {
  try {
    const [patients] = await pool.query('SELECT id FROM patient WHERE user_id = ?', [req.user.id]);
    if (patients.length === 0) return ApiResponse.success(res, []);

    const [reports] = await pool.query(
      `SELECT mr.*, u.first_name as uploaded_by_name,
       (SELECT COUNT(*) FROM report_access ra WHERE ra.report_id = mr.id AND ra.is_revoked = FALSE) as shared_count
       FROM medical_report mr
       JOIN user u ON mr.uploaded_by = u.id WHERE mr.patient_id = ? ORDER BY mr.created_at DESC`,
      [patients[0].id]
    );
    return ApiResponse.success(res, reports);
  } catch (error) { next(error); }
};

exports.getReportById = async (req, res, next) => {
  try {
    const [reports] = await pool.query('SELECT * FROM medical_report WHERE id = ?', [req.params.id]);
    if (reports.length === 0) return ApiResponse.notFound(res, 'Report not found');

    // Ownership check
    const [patient] = await pool.query('SELECT id FROM patient WHERE user_id = ?', [req.user.id]);
    const [doctor] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);

    const isOwner = patient.length > 0 && reports[0].patient_id === patient[0].id;
    let hasAccess = false;
    
    if (doctor.length > 0) {
      // Check explicit access
      const [access] = await pool.query(
        'SELECT id FROM report_access WHERE report_id = ? AND doctor_id = ? AND is_revoked = FALSE AND (expires_at IS NULL OR expires_at > NOW())',
        [req.params.id, doctor[0]?.id]
      );
      // Check if patient is this doctor's patient via appointments
      const [isPatient] = await pool.query(
        'SELECT id FROM appointment WHERE patient_id = ? AND doctor_id = ? LIMIT 1',
        [reports[0].patient_id, doctor[0]?.id]
      );
      
      hasAccess = access.length > 0 || isPatient.length > 0 || reports[0].uploaded_by === req.user.id;
    }

    if (!isOwner && !hasAccess && !req.user.roles.includes('super_admin')) {
      return ApiResponse.forbidden(res, 'Access denied');
    }

    return ApiResponse.success(res, reports[0]);
  } catch (error) { next(error); }
};

exports.getReportDownloadUrl = async (req, res, next) => {
  try {
    const [reports] = await pool.query('SELECT * FROM medical_report WHERE id = ?', [req.params.id]);
    if (reports.length === 0) return ApiResponse.notFound(res);

    const url = await getSignedUrl(reports[0].storage_path, 30);
    await logAudit(req.user.id, 'DOWNLOAD_REPORT', 'medical_report', req.params.id, null, null, req);
    return ApiResponse.success(res, { url, expiresIn: '30 minutes' });
  } catch (error) { next(error); }
};

exports.shareReport = async (req, res, next) => {
  try {
    const { doctorId, accessType, expiresInDays } = req.body;
    const reportId = req.params.id;

    const [patient] = await pool.query('SELECT id FROM patient WHERE user_id = ?', [req.user.id]);
    if (patient.length === 0) return ApiResponse.forbidden(res);

    const [report] = await pool.query('SELECT * FROM medical_report WHERE id = ? AND patient_id = ?', [reportId, patient[0].id]);
    if (report.length === 0) return ApiResponse.notFound(res, 'Report not found or access denied');

    // Check if already shared
    const [existing] = await pool.query(
      'SELECT id FROM report_access WHERE report_id = ? AND doctor_id = ? AND is_revoked = FALSE',
      [reportId, doctorId]
    );
    if (existing.length > 0) {
      await pool.query(
        'UPDATE report_access SET expires_at = DATE_ADD(NOW(), INTERVAL ? DAY), access_type = ? WHERE id = ?',
        [expiresInDays || 7, accessType || 'view', existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO report_access (report_id, doctor_id, granted_by, access_type, expires_at)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
        [reportId, doctorId, req.user.id, accessType || 'view', expiresInDays || 7]
      );
    }

    // Notify doctor
    const [doc] = await pool.query('SELECT user_id FROM doctor WHERE id = ?', [doctorId]);
    if (doc.length > 0) {
      await createNotification(doc[0].user_id, 'Report Shared', 'A patient shared a medical report with you', 'access', 'medical_report', reportId);
    }

    await logAudit(req.user.id, 'SHARE_REPORT', 'report_access', reportId, null, { doctorId }, req);
    return ApiResponse.success(res, null, 'Report shared successfully');
  } catch (error) { next(error); }
};

exports.revokeAccess = async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE report_access SET is_revoked = TRUE, revoked_at = NOW() WHERE id = ? AND granted_by = ?',
      [req.params.accessId, req.user.id]
    );
    return ApiResponse.success(res, null, 'Access revoked');
  } catch (error) { next(error); }
};

exports.getReportShares = async (req, res, next) => {
  try {
    const reportId = req.params.id;
    // Verify patient owns this report
    const [patient] = await pool.query('SELECT id FROM patient WHERE user_id = ?', [req.user.id]);
    if (patient.length === 0) return ApiResponse.forbidden(res);

    const [report] = await pool.query('SELECT id FROM medical_report WHERE id = ? AND patient_id = ?', [reportId, patient[0].id]);
    if (report.length === 0) return ApiResponse.notFound(res, 'Report not found or access denied');

    const [shares] = await pool.query(
      `SELECT ra.id as access_id, ra.access_type, ra.expires_at, ra.created_at,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name, d.id as doctor_id
       FROM report_access ra
       JOIN doctor d ON ra.doctor_id = d.id
       JOIN user u ON d.user_id = u.id
       WHERE ra.report_id = ? AND ra.is_revoked = FALSE
       ORDER BY ra.created_at DESC`,
      [reportId]
    );

    return ApiResponse.success(res, shares);
  } catch (error) { next(error); }
};

exports.getSharedReports = async (req, res, next) => {
  try {
    const [doctor] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doctor.length === 0) return ApiResponse.success(res, []);

    // 1. Reports explicitly shared via report_access
    const [sharedReports] = await pool.query(
      `SELECT mr.*, 
              u.first_name as patient_first_name, u.last_name as patient_last_name,
              up.first_name as uploaded_by_name, up.last_name as uploaded_by_last_name,
              ra.access_type, ra.expires_at, ra.id as access_id
       FROM report_access ra
       JOIN medical_report mr ON ra.report_id = mr.id
       JOIN patient p ON mr.patient_id = p.id
       JOIN user u ON p.user_id = u.id
       LEFT JOIN user up ON mr.uploaded_by = up.id
       WHERE ra.doctor_id = ? AND ra.is_revoked = FALSE
       ORDER BY mr.created_at DESC`,
      [doctor[0].id]
    );

    // 2. Reports from patients who have appointments with this doctor (but not already in sharedReports)
    const sharedIds = sharedReports.map(r => r.id);
    const placeholders = sharedIds.length > 0 ? sharedIds.map(() => '?').join(',') : '0';

    const [apptReports] = await pool.query(
      `SELECT DISTINCT mr.*, 
              u.first_name as patient_first_name, u.last_name as patient_last_name,
              up.first_name as uploaded_by_name, up.last_name as uploaded_by_last_name,
              NULL as access_type, NULL as expires_at, NULL as access_id
       FROM medical_report mr
       JOIN patient p ON mr.patient_id = p.id
       JOIN user u ON p.user_id = u.id
       LEFT JOIN user up ON mr.uploaded_by = up.id
       WHERE EXISTS (SELECT 1 FROM appointment a WHERE a.patient_id = p.id AND a.doctor_id = ?)
         AND mr.id NOT IN (${placeholders})
       ORDER BY mr.created_at DESC`,
      [doctor[0].id, ...sharedIds]
    );

    const allReports = [...sharedReports, ...apptReports].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return ApiResponse.success(res, allReports);
  } catch (error) { next(error); }
};

exports.deleteReport = async (req, res, next) => {
  try {
    const [report] = await pool.query('SELECT * FROM medical_report WHERE id = ?', [req.params.id]);
    if (report.length === 0) return ApiResponse.notFound(res);

    await deleteFile(report[0].storage_path);
    await pool.query('DELETE FROM medical_report WHERE id = ?', [req.params.id]);
    await logAudit(req.user.id, 'DELETE_REPORT', 'medical_report', req.params.id, null, null, req);
    return ApiResponse.success(res, null, 'Report deleted');
  } catch (error) { next(error); }
};
