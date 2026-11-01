const pool = require('../../database/connection');
const ApiResponse = require('../../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/logger');
const { emitToHospital, emitToAll } = require('../../socket');

exports.getAllHospitals = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
    const { search, city, state, specialty } = req.query;
    let where = 'h.is_active = TRUE AND h.is_verified = TRUE';
    const params = [];
    if (search) { where += ' AND (h.name LIKE ? OR h.description LIKE ? OR h.city LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (city) { where += ' AND h.city = ?'; params.push(city); }
    if (state) { where += ' AND h.state = ?'; params.push(state); }

    const [countRes] = await pool.query(`SELECT COUNT(*) as total FROM hospital h WHERE ${where}`, params);
    const [hospitals] = await pool.query(
      `SELECT h.*, hl.latitude, hl.longitude, hl.formatted_address,
              (SELECT COUNT(*) FROM doctor d WHERE d.hospital_id = h.id AND d.is_available = TRUE) as doctor_count
       FROM hospital h LEFT JOIN hospital_location hl ON h.id = hl.hospital_id
       WHERE ${where} ORDER BY h.rating DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return ApiResponse.paginated(res, hospitals, getPaginationMeta(countRes[0].total, page, limit));
  } catch (error) { next(error); }
};

exports.getAdminHospitals = async (req, res, next) => {
  try {
    const { status } = req.query;
    let where = '1=1';
    const params = [];
    
    if (status === 'pending') {
      where += ' AND h.is_verified = FALSE';
    } else if (status === 'active') {
      where += ' AND h.is_active = TRUE AND h.is_verified = TRUE';
    } else if (status === 'suspended') {
      where += ' AND h.is_active = FALSE AND h.is_verified = TRUE';
    }

    const [hospitals] = await pool.query(
      `SELECT h.*, hl.latitude, hl.longitude, hl.formatted_address,
              (SELECT COUNT(*) FROM doctor d WHERE d.hospital_id = h.id AND d.is_available = TRUE) as doctor_count
       FROM hospital h LEFT JOIN hospital_location hl ON h.id = hl.hospital_id
       WHERE ${where} ORDER BY h.created_at DESC`,
      params
    );
    return ApiResponse.success(res, hospitals);
  } catch (error) { next(error); }
};

exports.getHospitalById = async (req, res, next) => {
  try {
    const [hospitals] = await pool.query(
      `SELECT h.*, hl.latitude, hl.longitude, hl.formatted_address FROM hospital h
       LEFT JOIN hospital_location hl ON h.id = hl.hospital_id WHERE h.id = ?`, [req.params.id]
    );
    if (hospitals.length === 0) return ApiResponse.notFound(res, 'Hospital not found');

    const [departments] = await pool.query('SELECT * FROM department WHERE hospital_id = ? AND is_active = TRUE', [req.params.id]);
    const [doctors] = await pool.query(
      `SELECT d.id, u.first_name, u.last_name, u.avatar_url, d.qualification, d.experience_years,
              d.consultation_fee, d.rating, GROUP_CONCAT(s.name) as specialties
       FROM doctor d JOIN user u ON d.user_id = u.id
       LEFT JOIN doctor_specialty ds ON d.id = ds.doctor_id LEFT JOIN specialty s ON ds.specialty_id = s.id
       WHERE d.hospital_id = ? AND d.is_available = TRUE AND u.is_active = TRUE GROUP BY d.id`,
      [req.params.id]
    );

    return ApiResponse.success(res, { ...hospitals[0], departments, doctors });
  } catch (error) { next(error); }
};

exports.getNearbyHospitals = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    if (!lat || !lng) return ApiResponse.badRequest(res, 'Latitude and longitude are required');

    const [hospitals] = await pool.query(
      `SELECT h.*, hl.latitude, hl.longitude, hl.formatted_address,
              (6371 * acos(cos(radians(?)) * cos(radians(hl.latitude)) * cos(radians(hl.longitude) - radians(?)) + sin(radians(?)) * sin(radians(hl.latitude)))) AS distance,
              (SELECT COUNT(*) FROM doctor d WHERE d.hospital_id = h.id AND d.is_available = TRUE) as doctor_count
       FROM hospital h JOIN hospital_location hl ON h.id = hl.hospital_id
       WHERE h.is_active = TRUE
       HAVING distance < ? ORDER BY distance LIMIT 20`,
      [lat, lng, lat, radius]
    );
    return ApiResponse.success(res, hospitals);
  } catch (error) { next(error); }
};

exports.createHospital = async (req, res, next) => {
  try {
    const { name, description, email, phone, website, addressLine1, addressLine2, city, state, zipCode, registrationNumber, establishedYear, bedCount, latitude, longitude } = req.body;
    const [result] = await pool.query(
      `INSERT INTO hospital (name, description, email, phone, website, address_line1, address_line2, city, state, zip_code, registration_number, established_year, bed_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, email, phone, website, addressLine1, addressLine2, city, state, zipCode, registrationNumber, establishedYear, bedCount || 0]
    );
    if (latitude && longitude) {
      await pool.query('INSERT INTO hospital_location (hospital_id, latitude, longitude, formatted_address) VALUES (?, ?, ?, ?)',
        [result.insertId, latitude, longitude, `${addressLine1}, ${city}, ${state}`]);
    }
    await logAudit(req.user.id, 'CREATE_HOSPITAL', 'hospital', result.insertId, null, { name }, req);
    return ApiResponse.created(res, { id: result.insertId }, 'Hospital created');
  } catch (error) { next(error); }
};

exports.updateHospital = async (req, res, next) => {
  try {
    const { name, description, email, phone, website, addressLine1, addressLine2, city, state, zipCode, bedCount, latitude, longitude } = req.body;
    await pool.query(
      `UPDATE hospital SET name=COALESCE(?,name), description=COALESCE(?,description), email=COALESCE(?,email),
       phone=COALESCE(?,phone), website=COALESCE(?,website), address_line1=COALESCE(?,address_line1),
       address_line2=COALESCE(?,address_line2), city=COALESCE(?,city), state=COALESCE(?,state),
       zip_code=COALESCE(?,zip_code), bed_count=COALESCE(?,bed_count) WHERE id=?`,
      [name, description, email, phone, website, addressLine1, addressLine2, city, state, zipCode, bedCount, req.params.id]
    );
    if (latitude && longitude) {
      await pool.query(
        `INSERT INTO hospital_location (hospital_id, latitude, longitude, formatted_address) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE latitude=?, longitude=?, formatted_address=?`,
        [req.params.id, latitude, longitude, `${addressLine1 || ''}, ${city || ''}, ${state || ''}`, latitude, longitude, `${addressLine1 || ''}, ${city || ''}, ${state || ''}`]
      );
      
      // Realtime sync for location changes
      emitToAll('hospital_location_updated_global', { hospitalId: req.params.id, latitude, longitude });
    }
    
    // Realtime sync for bed_count changes
    if (bedCount !== undefined) {
      emitToHospital(req.params.id, 'hospital_updated', { hospitalId: req.params.id, bedCount });
      emitToAll('hospital_updated_global', { hospitalId: req.params.id, bedCount }); // for the map
    }

    return ApiResponse.success(res, null, 'Hospital updated');
  } catch (error) { next(error); }
};

exports.deleteHospital = async (req, res, next) => {
  try {
    await pool.query('UPDATE hospital SET is_active = FALSE WHERE id = ?', [req.params.id]);
    await logAudit(req.user.id, 'DELETE_HOSPITAL', 'hospital', req.params.id, null, null, req);
    return ApiResponse.success(res, null, 'Hospital deactivated');
  } catch (error) { next(error); }
};

exports.updateHospitalStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    let isActive = false;
    let isVerified = false;

    if (status === 'approve') {
      isActive = true;
      isVerified = true;
    } else if (status === 'suspend') {
      isActive = false;
      isVerified = true;
    } else if (status === 'reject') {
      isActive = false;
      isVerified = false;
    } else {
      return ApiResponse.badRequest(res, 'Invalid status');
    }

    await pool.query(
      'UPDATE hospital SET is_active = ?, is_verified = ? WHERE id = ?',
      [isActive, isVerified, req.params.id]
    );
    await logAudit(req.user.id, 'UPDATE_HOSPITAL_STATUS', 'hospital', req.params.id, null, { status }, req);
    
    return ApiResponse.success(res, null, `Hospital ${status}d successfully`);
  } catch (error) { next(error); }
};

// Department CRUD
exports.getDepartments = async (req, res, next) => {
  try {
    const [depts] = await pool.query('SELECT * FROM department WHERE hospital_id = ? AND is_active = TRUE', [req.params.hospitalId]);
    return ApiResponse.success(res, depts);
  } catch (error) { next(error); }
};

exports.createDepartment = async (req, res, next) => {
  try {
    const { name, description, floorNumber } = req.body;
    const [result] = await pool.query(
      'INSERT INTO department (hospital_id, name, description, floor_number) VALUES (?, ?, ?, ?)',
      [req.params.hospitalId, name, description, floorNumber]
    );
    return ApiResponse.created(res, { id: result.insertId }, 'Department created');
  } catch (error) { next(error); }
};

exports.getSpecialties = async (req, res, next) => {
  try {
    const [specs] = await pool.query('SELECT * FROM specialty ORDER BY name');
    return ApiResponse.success(res, specs);
  } catch (error) { next(error); }
};

exports.addHospitalReview = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const hospitalId = parseInt(req.params.id);
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return ApiResponse.badRequest(res, 'Rating must be between 1 and 5');
    }

    const [pat] = await connection.query('SELECT id FROM patient WHERE user_id = ?', [req.user.id]);
    if (pat.length === 0) return ApiResponse.forbidden(res);
    const patientId = pat[0].id;

    // Check if patient has a completed appointment at this hospital
    const [appts] = await connection.query(
      'SELECT id FROM appointment WHERE patient_id = ? AND hospital_id = ? AND status_id = 4 LIMIT 1',
      [patientId, hospitalId]
    );

    if (appts.length === 0) {
      return ApiResponse.forbidden(res, 'You can only review hospitals where you have completed an appointment');
    }

    await connection.beginTransaction();

    // Insert or update review (using ON DUPLICATE KEY UPDATE)
    await connection.query(
      `INSERT INTO hospital_review (hospital_id, patient_id, rating, comment) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
      [hospitalId, patientId, rating, comment]
    );

    // Recalculate average rating for hospital
    const [stats] = await connection.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM hospital_review WHERE hospital_id = ?',
      [hospitalId]
    );

    const avgRating = stats[0].avg_rating || 0;
    const totalReviews = stats[0].total_reviews || 0;

    await connection.query(
      'UPDATE hospital SET rating = ?, total_reviews = ? WHERE id = ?',
      [avgRating, totalReviews, hospitalId]
    );

    await connection.commit();
    
    // Optionally emit socket event to update the directory live
    emitToAll('hospital_updated_global', { hospitalId, rating: avgRating, totalReviews });

    return ApiResponse.success(res, { rating: avgRating, totalReviews }, 'Review submitted successfully');
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
