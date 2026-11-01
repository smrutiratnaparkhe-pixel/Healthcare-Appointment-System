const pool = require('../../database/connection');
const ApiResponse = require('../../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');

exports.createReview = async (req, res, next) => {
  try {
    const { doctorId, appointmentId, rating, title, comment, isAnonymous } = req.body;
    const [patient] = await pool.query('SELECT id FROM patient WHERE user_id = ?', [req.user.id]);
    if (patient.length === 0) return ApiResponse.forbidden(res);

    // Check if already reviewed this appointment
    if (appointmentId) {
      const [existing] = await pool.query('SELECT id FROM review WHERE patient_id = ? AND appointment_id = ?', [patient[0].id, appointmentId]);
      if (existing.length > 0) return ApiResponse.conflict(res, 'Already reviewed this appointment');
    }

    const [result] = await pool.query(
      'INSERT INTO review (patient_id, doctor_id, appointment_id, rating, title, comment, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [patient[0].id, doctorId, appointmentId, rating, title, comment, isAnonymous || false]
    );

    // Update doctor rating
    const [avgResult] = await pool.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM review WHERE doctor_id = ? AND is_visible = TRUE', [doctorId]
    );
    await pool.query('UPDATE doctor SET rating = ?, total_reviews = ? WHERE id = ?',
      [avgResult[0].avg_rating || 0, avgResult[0].total, doctorId]);

    return ApiResponse.created(res, { id: result.insertId }, 'Review submitted');
  } catch (error) { next(error); }
};

exports.getDoctorReviews = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
    const [countRes] = await pool.query('SELECT COUNT(*) as total FROM review WHERE doctor_id = ? AND is_visible = TRUE', [req.params.doctorId]);
    const [reviews] = await pool.query(
      `SELECT r.*, CASE WHEN r.is_anonymous THEN 'Anonymous' ELSE CONCAT(u.first_name, ' ', u.last_name) END as reviewer_name
       FROM review r JOIN patient p ON r.patient_id = p.id JOIN user u ON p.user_id = u.id
       WHERE r.doctor_id = ? AND r.is_visible = TRUE ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [req.params.doctorId, limit, offset]
    );
    return ApiResponse.paginated(res, reviews, getPaginationMeta(countRes[0].total, page, limit));
  } catch (error) { next(error); }
};

exports.deleteReview = async (req, res, next) => {
  try {
    await pool.query('UPDATE review SET is_visible = FALSE WHERE id = ?', [req.params.id]);
    return ApiResponse.success(res, null, 'Review removed');
  } catch (error) { next(error); }
};
