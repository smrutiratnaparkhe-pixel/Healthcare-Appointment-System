const pool = require('../../database/connection');
const ApiResponse = require('../../utils/apiResponse');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const [users] = await pool.query('SELECT COUNT(*) as total FROM user WHERE is_active = TRUE');
    const [patients] = await pool.query('SELECT COUNT(*) as total FROM patient');
    const [doctors] = await pool.query('SELECT COUNT(*) as total FROM doctor');
    const [hospitals] = await pool.query('SELECT COUNT(*) as total FROM hospital WHERE is_active = TRUE');
    const [appointments] = await pool.query('SELECT COUNT(*) as total FROM appointment');
    const [todayAppts] = await pool.query('SELECT COUNT(*) as total FROM appointment WHERE appointment_date = CURDATE()');
    const [reports] = await pool.query('SELECT COUNT(*) as total FROM medical_report');
    
    // Get breakdown of users by role (excluding super_admin)
    const [usersByRole] = await pool.query(`
      SELECT r.name as name, COUNT(ur.user_id) as value 
      FROM user_role ur
      JOIN role r ON ur.role_id = r.id
      JOIN user u ON ur.user_id = u.id
      WHERE u.is_active = TRUE AND r.name != 'super_admin' 
      GROUP BY r.name
    `);

    return ApiResponse.success(res, {
      totalUsers: users[0].total,
      totalPatients: patients[0].total,
      totalDoctors: doctors[0].total,
      totalHospitals: hospitals[0].total,
      totalAppointments: appointments[0].total,
      todayAppointments: todayAppts[0].total,
      totalReports: reports[0].total,
      usersByRole: usersByRole
    });
  } catch (error) { next(error); }
};

exports.getAppointmentTrends = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const [trends] = await pool.query(
      `SELECT DATE(appointment_date) as date, COUNT(*) as count,
              SUM(CASE WHEN status_id = 4 THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN status_id = 5 THEN 1 ELSE 0 END) as cancelled
       FROM appointment WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(appointment_date) ORDER BY date`, [parseInt(days)]
    );
    return ApiResponse.success(res, trends);
  } catch (error) { next(error); }
};

exports.getDoctorStats = async (req, res, next) => {
  try {
    const [topDoctors] = await pool.query(
      `SELECT d.id, u.first_name, u.last_name, d.rating, d.total_reviews,
              COUNT(a.id) as total_appointments,
              SUM(CASE WHEN a.status_id = 4 THEN 1 ELSE 0 END) as completed_appointments
       FROM doctor d JOIN user u ON d.user_id = u.id
       LEFT JOIN appointment a ON d.id = a.doctor_id
       GROUP BY d.id ORDER BY d.rating DESC LIMIT 10`
    );
    return ApiResponse.success(res, topDoctors);
  } catch (error) { next(error); }
};

exports.getPatientStats = async (req, res, next) => {
  try {
    const [monthly] = await pool.query(
      `SELECT DATE_FORMAT(u.created_at, '%Y-%m') as month, COUNT(*) as count
       FROM patient p JOIN user u ON p.user_id = u.id
       WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY month ORDER BY month`
    );
    return ApiResponse.success(res, monthly);
  } catch (error) { next(error); }
};

exports.getMyPatientStats = async (req, res, next) => {
  try {
    const [patientResult] = await pool.query('SELECT id FROM patient WHERE user_id = ?', [req.user.id]);
    if (patientResult.length === 0) return ApiResponse.notFound(res, 'Patient profile not found');
    const patientId = patientResult[0].id;

    const [appointments] = await pool.query('SELECT COUNT(*) as total FROM appointment WHERE patient_id = ?', [patientId]);
    const [upcoming] = await pool.query('SELECT COUNT(*) as total FROM appointment WHERE patient_id = ? AND status_id = 1 AND appointment_date >= CURDATE()', [patientId]);
    const [reports] = await pool.query('SELECT COUNT(*) as total FROM medical_report WHERE patient_id = ?', [patientId]);
    const [completed] = await pool.query('SELECT COUNT(*) as total FROM appointment WHERE patient_id = ? AND status_id = 4', [patientId]);

    return ApiResponse.success(res, {
      totalAppointments: appointments[0].total,
      upcomingAppointments: upcoming[0].total,
      totalReports: reports[0].total,
      completedConsultations: completed[0].total
    });
  } catch (error) { next(error); }
};

exports.getMyDoctorStats = async (req, res, next) => {
  try {
    const [doctorResult] = await pool.query('SELECT id FROM doctor WHERE user_id = ?', [req.user.id]);
    if (doctorResult.length === 0) return ApiResponse.notFound(res, 'Doctor profile not found');
    const doctorId = doctorResult[0].id;

    const [appointments] = await pool.query('SELECT COUNT(*) as total FROM appointment WHERE doctor_id = ?', [doctorId]);
    const [todayAppts] = await pool.query('SELECT COUNT(*) as total FROM appointment WHERE doctor_id = ? AND appointment_date = CURDATE()', [doctorId]);
    const [completedAppts] = await pool.query('SELECT COUNT(*) as total FROM appointment WHERE doctor_id = ? AND appointment_date = CURDATE() AND status_id = 4', [doctorId]);
    const [sharedReports] = await pool.query('SELECT COUNT(*) as total FROM report_access WHERE doctor_id = ? AND is_revoked = FALSE', [doctorId]);

    return ApiResponse.success(res, {
      totalAppointments: appointments[0].total,
      todayAppointments: todayAppts[0].total,
      completedToday: completedAppts[0].total,
      sharedReports: sharedReports[0].total
    });
  } catch (error) { next(error); }
};

exports.getHospitalAnalytics = async (req, res, next) => {
  try {
    const hospitalId = req.params.hospitalId;
    const [stats] = await pool.query(
      `SELECT COUNT(DISTINCT a.id) as total_appointments,
              COUNT(DISTINCT d.id) as total_doctors,
              COUNT(DISTINCT dep.id) as total_departments,
              AVG(d.rating) as avg_doctor_rating
       FROM hospital h
       LEFT JOIN doctor d ON h.id = d.hospital_id
       LEFT JOIN appointment a ON d.id = a.doctor_id
       LEFT JOIN department dep ON h.id = dep.hospital_id
       WHERE h.id = ?`, [hospitalId]
    );

    const [daily] = await pool.query(
      `SELECT DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as date, COUNT(*) as count
       FROM appointment a JOIN doctor d ON a.doctor_id = d.id
       WHERE d.hospital_id = ? AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       GROUP BY date ORDER BY date`, [hospitalId]
    );

    return ApiResponse.success(res, { ...stats[0], dailyAppointments: daily });
  } catch (error) { next(error); }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const [countRes] = await pool.query('SELECT COUNT(*) as total FROM audit_log');
    const [logs] = await pool.query(
      `SELECT al.*, u.first_name, u.last_name, u.email FROM audit_log al
       LEFT JOIN user u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );
    return ApiResponse.paginated(res, logs, {
      total: countRes[0].total, page: parseInt(page), limit: parseInt(limit),
      totalPages: Math.ceil(countRes[0].total / limit)
    });
  } catch (error) { next(error); }
};
