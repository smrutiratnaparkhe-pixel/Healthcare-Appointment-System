const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../../config');
const pool = require('../../database/connection');
const ApiResponse = require('../../utils/apiResponse');
const { logAudit, logActivity } = require('../../utils/logger');

/**
 * Generate JWT tokens
 */
function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
  return { accessToken, refreshToken };
}

/**
 * Set auth cookies
 */
function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,                        // must be true when sameSite='none'
    sameSite: isProd ? 'none' : 'lax',    // 'none' required for cross-origin (Render frontend ↔ backend)
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

/**
 * POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, dateOfBirth, gender, role } = req.body;

    // Check if user exists
    const [existing] = await pool.query('SELECT id FROM user WHERE email = ?', [email]);
    if (existing.length > 0) {
      return ApiResponse.conflict(res, 'Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [result] = await pool.query(
      `INSERT INTO user (email, password_hash, first_name, last_name, phone, date_of_birth, gender, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, FALSE)`,
      [email, passwordHash, firstName, lastName, phone || null, dateOfBirth || null, gender || null]
    );

    const userId = result.insertId;

    // Assign role
    const roleName = role || 'patient';
    const [roles] = await pool.query('SELECT id FROM role WHERE name = ?', [roleName]);
    if (roles.length > 0) {
      await pool.query('INSERT INTO user_role (user_id, role_id) VALUES (?, ?)', [userId, roles[0].id]);
    }

    // Create patient profile if role is patient
    if (roleName === 'patient') {
      await pool.query('INSERT INTO patient (user_id) VALUES (?)', [userId]);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(userId);

    // Store refresh token
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.query(
      `INSERT INTO refresh_token (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)`,
      [userId, tokenHash, req.ip, req.get('user-agent')]
    );

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    // Log
    await logAudit(userId, 'REGISTER', 'user', userId, null, { email, role: roleName }, req);
    await logActivity(userId, 'User registered', 'auth', null, req);

    return ApiResponse.created(res, {
      user: { id: userId, email, firstName, lastName, roles: [roleName] },
      accessToken,
      refreshToken,
    }, 'Registration successful');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register-hospital
 * Registers a new hospital admin and a pending hospital application
 */
exports.registerHospital = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { 
      firstName, lastName, email, phone, password, 
      hospitalName, registrationNumber, hospitalEmail, hospitalPhone, 
      addressLine1, city, state, zipCode, description, bedCount 
    } = req.body;

    // Check if user exists
    const [existingUser] = await connection.query('SELECT id FROM user WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      await connection.rollback();
      return ApiResponse.conflict(res, 'Admin email already registered');
    }

    // Check if hospital exists
    const [existingHospital] = await connection.query('SELECT id FROM hospital WHERE registration_number = ?', [registrationNumber]);
    if (existingHospital.length > 0) {
      await connection.rollback();
      return ApiResponse.conflict(res, 'Hospital with this registration number already exists');
    }

    // Create User
    const passwordHash = await bcrypt.hash(password, 12);
    const [userResult] = await connection.query(
      `INSERT INTO user (email, password_hash, first_name, last_name, phone, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, TRUE, FALSE)`,
      [email, passwordHash, firstName, lastName, phone]
    );
    const userId = userResult.insertId;

    // Assign hospital_admin role
    const [roles] = await connection.query('SELECT id FROM role WHERE name = ?', ['hospital_admin']);
    if (roles.length > 0) {
      await connection.query('INSERT INTO user_role (user_id, role_id) VALUES (?, ?)', [userId, roles[0].id]);
    }

    // Create Hospital (Pending Status)
    const [hospitalResult] = await connection.query(
      `INSERT INTO hospital (name, description, email, phone, address_line1, city, state, zip_code, registration_number, bed_count, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, FALSE)`,
      [hospitalName, description, hospitalEmail, hospitalPhone, addressLine1, city, state, zipCode, registrationNumber, bedCount || 0]
    );
    const hospitalId = hospitalResult.insertId;

    // Map Admin to Hospital
    await connection.query(
      'INSERT INTO hospital_admin (user_id, hospital_id, designation) VALUES (?, ?, ?)',
      [userId, hospitalId, 'Administrator']
    );

    await connection.commit();

    // Generate tokens for immediate login
    const { accessToken, refreshToken } = generateTokens(userId);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.query(
      `INSERT INTO refresh_token (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)`,
      [userId, tokenHash, req.ip, req.get('user-agent')]
    );
    setAuthCookies(res, accessToken, refreshToken);

    await logActivity(userId, 'Hospital application submitted', 'auth', null, req);

    return ApiResponse.created(res, {
      user: { id: userId, email, firstName, lastName, roles: ['hospital_admin'] },
      hospital: { id: hospitalId, status: 'pending' },
      accessToken,
      refreshToken
    }, 'Hospital application submitted successfully');

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const [users] = await pool.query(
      `SELECT u.*, GROUP_CONCAT(r.name) as roles FROM user u
       LEFT JOIN user_role ur ON u.id = ur.user_id
       LEFT JOIN role r ON ur.role_id = r.id
       WHERE u.email = ? GROUP BY u.id`,
      [email]
    );

    if (users.length === 0) {
      return ApiResponse.unauthorized(res, 'Invalid email or password');
    }

    const user = users[0];

    if (!user.is_active) {
      return ApiResponse.forbidden(res, 'Account has been deactivated');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return ApiResponse.unauthorized(res, 'Invalid email or password');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.query(
      `INSERT INTO refresh_token (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)`,
      [user.id, tokenHash, req.ip, req.get('user-agent')]
    );

    // Update last login
    await pool.query('UPDATE user SET last_login_at = NOW() WHERE id = ?', [user.id]);

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    await logActivity(user.id, 'User logged in', 'auth', null, req);

    return ApiResponse.success(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: user.roles ? user.roles.split(',') : [],
        avatar: user.avatar_url,
      },
      accessToken,
      refreshToken,
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 */
exports.refreshToken = async (req, res, next) => {
  try {
    let token = req.body.refreshToken || req.cookies.refresh_token;

    if (!token) {
      return ApiResponse.unauthorized(res, 'Refresh token required');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.refreshSecret);

    // Check in database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [tokens] = await pool.query(
      'SELECT * FROM refresh_token WHERE token_hash = ? AND user_id = ? AND is_revoked = FALSE AND expires_at > NOW()',
      [tokenHash, decoded.userId]
    );

    if (tokens.length === 0) {
      return ApiResponse.unauthorized(res, 'Invalid or expired refresh token');
    }

    // Revoke old token
    await pool.query(
      'UPDATE refresh_token SET is_revoked = TRUE, revoked_at = NOW() WHERE id = ?',
      [tokens[0].id]
    );

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

    // Store new refresh token
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await pool.query(
      `INSERT INTO refresh_token (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)`,
      [decoded.userId, newTokenHash, req.ip, req.get('user-agent')]
    );

    setAuthCookies(res, accessToken, newRefreshToken);

    return ApiResponse.success(res, { accessToken, refreshToken: newRefreshToken }, 'Token refreshed');
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'Refresh token expired. Please login again.');
    }
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    if (req.user) {
      // Revoke all refresh tokens for user
      await pool.query(
        'UPDATE refresh_token SET is_revoked = TRUE, revoked_at = NOW() WHERE user_id = ? AND is_revoked = FALSE',
        [req.user.id]
      );
      await logActivity(req.user.id, 'User logged out', 'auth', null, req);
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });

    return ApiResponse.success(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
exports.getMe = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
              u.date_of_birth, u.gender, u.address_line1, u.address_line2,
              u.city, u.state, u.zip_code, u.country, u.is_verified, u.first_login_completed, u.last_login_at, u.created_at
       FROM user u WHERE u.id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return ApiResponse.notFound(res, 'User not found');
    }

    const user = users[0];

    // Get role-specific data
    let profileData = {};

    if (req.user.roles.includes('patient')) {
      const [patients] = await pool.query('SELECT * FROM patient WHERE user_id = ?', [req.user.id]);
      if (patients.length > 0) profileData.patient = patients[0];
    }

    if (req.user.roles.includes('doctor')) {
      const [doctors] = await pool.query(
        `SELECT d.*, h.name as hospital_name, dep.name as department_name
         FROM doctor d
         LEFT JOIN hospital h ON d.hospital_id = h.id
         LEFT JOIN department dep ON d.department_id = dep.id
         WHERE d.user_id = ?`,
        [req.user.id]
      );
      if (doctors.length > 0) profileData.doctor = doctors[0];
    }

    if (req.user.roles.includes('hospital_admin')) {
      const [admins] = await pool.query(
        `SELECT ha.*, h.name as hospital_name, h.is_verified as hospital_is_verified, h.is_active as hospital_is_active FROM hospital_admin ha
         LEFT JOIN hospital h ON ha.hospital_id = h.id
         WHERE ha.user_id = ?`,
        [req.user.id]
      );
      if (admins.length > 0) profileData.hospitalAdmin = admins[0];
    }

    return ApiResponse.success(res, {
      ...user,
      roles: req.user.roles,
      permissions: req.user.permissions,
      ...profileData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/change-password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const [users] = await pool.query('SELECT password_hash FROM user WHERE id = ?', [req.user.id]);
    if (users.length === 0) return ApiResponse.notFound(res, 'User not found');

    const isValid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValid) return ApiResponse.badRequest(res, 'Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE user SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    await pool.query(
      'UPDATE refresh_token SET is_revoked = TRUE, revoked_at = NOW() WHERE user_id = ?',
      [req.user.id]
    );

    await logAudit(req.user.id, 'PASSWORD_CHANGE', 'user', req.user.id, null, null, req);

    return ApiResponse.success(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { 
      firstName, lastName, phone, avatarUrl, gender, dateOfBirth, addressLine1, city,
      bloodGroup, emergencyContactName, emergencyContactPhone, allergies, medicalHistory 
    } = req.body;
    
    await pool.query(
      `UPDATE user SET 
        first_name = ?, last_name = ?, phone = ?, avatar_url = ?,
        gender = ?, date_of_birth = ?, address_line1 = ?, city = ?
       WHERE id = ?`,
      [
        firstName, lastName, phone || null, avatarUrl || null,
        gender || null, dateOfBirth || null, addressLine1 || null, city || null,
        req.user.id
      ]
    );

    if (req.user.roles.includes('patient')) {
      await pool.query(
        `UPDATE patient SET blood_group = ?, emergency_contact_name = ?, emergency_contact_phone = ?, allergies = ?, medical_history = ? WHERE user_id = ?`,
        [bloodGroup || null, emergencyContactName || null, emergencyContactPhone || null, allergies || null, medicalHistory || null, req.user.id]
      );
    }
    
    await logAudit(req.user.id, 'UPDATE_PROFILE', 'user', req.user.id, null, { firstName, lastName, phone }, req);
    
    return ApiResponse.success(res, null, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/avatar
 */
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return ApiResponse.badRequest(res, 'No image file provided');
    const { uploadFile, getSignedUrl } = require('../../supabase/storage');
    const path = await uploadFile(req.file, 'avatars');
    const url = await getSignedUrl(path, 365 * 24 * 60); // 1 year expiry for avatar
    
    await pool.query('UPDATE user SET avatar_url = ? WHERE id = ?', [url, req.user.id]);
    await logAudit(req.user.id, 'UPLOAD_AVATAR', 'user', req.user.id, null, null, req);
    
    return ApiResponse.success(res, { avatarUrl: url }, 'Avatar updated successfully');
  } catch (error) { next(error); }
};

/**
 * PUT /api/auth/first-login-setup
 * Doctor first-login password setup. Only works if first_login_completed = FALSE
 */
exports.firstLoginSetup = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return ApiResponse.badRequest(res, 'Current password and new password are required');
    }
    if (newPassword.length < 6) {
      return ApiResponse.badRequest(res, 'New password must be at least 6 characters');
    }

    const [users] = await pool.query('SELECT password_hash, first_login_completed FROM user WHERE id = ?', [req.user.id]);
    if (users.length === 0) return ApiResponse.notFound(res, 'User not found');

    if (users[0].first_login_completed) {
      return ApiResponse.badRequest(res, 'Password has already been set. Use the regular change password flow.');
    }

    const isValid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValid) return ApiResponse.badRequest(res, 'Temporary password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE user SET password_hash = ?, first_login_completed = TRUE WHERE id = ?',
      [newHash, req.user.id]
    );

    await logAudit(req.user.id, 'FIRST_LOGIN_PASSWORD_SETUP', 'user', req.user.id, null, null, req);

    return ApiResponse.success(res, null, 'Password set successfully. Welcome aboard!');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/sessions
 */
exports.getSessions = async (req, res, next) => {
  try {
    const [sessions] = await pool.query(
      `SELECT id, ip_address, user_agent, created_at, expires_at 
       FROM refresh_token 
       WHERE user_id = ? AND is_revoked = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return ApiResponse.success(res, sessions);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/auth/sessions/:id
 */
exports.revokeSession = async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE refresh_token SET is_revoked = TRUE, revoked_at = NOW() WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    return ApiResponse.success(res, null, 'Session revoked successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/activity
 */
exports.getActivityLogs = async (req, res, next) => {
  try {
    const [logs] = await pool.query(
      `SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    return ApiResponse.success(res, logs);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/notifications/preferences
 */
exports.getNotificationPreferences = async (req, res, next) => {
  try {
    const [prefs] = await pool.query(
      'SELECT * FROM user_notification_preference WHERE user_id = ?',
      [req.user.id]
    );
    
    if (prefs.length === 0) {
      // Return default preferences
      return ApiResponse.success(res, {
        appointment_alerts: true,
        emergency_alerts: true,
        email_notifications: true,
        sms_notifications: false
      });
    }
    
    return ApiResponse.success(res, prefs[0]);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/notifications/preferences
 */
exports.updateNotificationPreferences = async (req, res, next) => {
  try {
    const { appointmentAlerts, emergencyAlerts, emailNotifications, smsNotifications } = req.body;
    
    const [existing] = await pool.query('SELECT id FROM user_notification_preference WHERE user_id = ?', [req.user.id]);
    
    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO user_notification_preference 
         (user_id, appointment_alerts, emergency_alerts, email_notifications, sms_notifications) 
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, appointmentAlerts ?? true, emergencyAlerts ?? true, emailNotifications ?? true, smsNotifications ?? false]
      );
    } else {
      await pool.query(
        `UPDATE user_notification_preference SET 
         appointment_alerts = COALESCE(?, appointment_alerts),
         emergency_alerts = COALESCE(?, emergency_alerts),
         email_notifications = COALESCE(?, email_notifications),
         sms_notifications = COALESCE(?, sms_notifications)
         WHERE user_id = ?`,
        [appointmentAlerts, emergencyAlerts, emailNotifications, smsNotifications, req.user.id]
      );
    }
    
    return ApiResponse.success(res, null, 'Notification preferences updated');
  } catch (error) {
    next(error);
  }
};
