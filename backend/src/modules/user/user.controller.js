const pool = require('../../database/connection');
const ApiResponse = require('../../utils/apiResponse');
const { logAudit } = require('../../utils/logger');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');

exports.getAllUsers = async (req, res, next) => {
  try {
    const { limit, offset, page } = getPagination(req.query.page, req.query.limit);
    
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.created_at, 
              GROUP_CONCAT(DISTINCT r.name) as roles,
              COALESCE(
                MAX(h_doc.name), 
                MAX(h_adm.name), 
                (SELECT h.name FROM appointment a JOIN hospital h ON a.hospital_id = h.id JOIN patient p ON a.patient_id = p.id WHERE p.user_id = u.id ORDER BY a.created_at DESC LIMIT 1)
              ) as hospital_name
       FROM user u
       LEFT JOIN user_role ur ON u.id = ur.user_id
       LEFT JOIN role r ON ur.role_id = r.id
       LEFT JOIN doctor d ON d.user_id = u.id
       LEFT JOIN hospital h_doc ON d.hospital_id = h_doc.id
       LEFT JOIN hospital_admin ha ON ha.user_id = u.id
       LEFT JOIN hospital h_adm ON ha.hospital_id = h_adm.id
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [totalRows] = await pool.query('SELECT COUNT(*) as count FROM user');
    const meta = getPaginationMeta(totalRows[0].count, page, limit);

    return ApiResponse.paginated(res, users, meta, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.created_at, GROUP_CONCAT(r.name) as roles
       FROM user u
       LEFT JOIN user_role ur ON u.id = ur.user_id
       LEFT JOIN role r ON ur.role_id = r.id
       WHERE u.id = ?
       GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.created_at`,
      [req.params.id]
    );

    if (users.length === 0) return ApiResponse.notFound(res, 'User not found');
    return ApiResponse.success(res, users[0]);
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  // Stub implementation
  return ApiResponse.success(res, {}, 'User updated');
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    await pool.query('UPDATE user SET is_active = ? WHERE id = ?', [isActive, id]);
    await logAudit(req.user.id, 'UPDATE', 'user', id, null, { is_active: isActive }, req);
    
    return ApiResponse.success(res, null, 'User status updated');
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM user WHERE id = ?', [id]);
    await logAudit(req.user.id, 'DELETE', 'user', id, null, null, req);
    return ApiResponse.success(res, null, 'User deleted');
  } catch (error) {
    next(error);
  }
};
