const router = require('express').Router();
const authController = require('../modules/auth/auth.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema, changePasswordSchema } = require('../validators/auth.validator');

router.post('/register', validate(registerSchema), authController.register);
router.post('/register-hospital', authController.registerHospital);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);
const upload = require('../middleware/upload');
router.post('/avatar', authenticate, upload.single('file'), authController.uploadAvatar);
router.put('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.put('/first-login-setup', authenticate, authController.firstLoginSetup);

// Profile Settings routes
router.get('/sessions', authenticate, authController.getSessions);
router.delete('/sessions/:id', authenticate, authController.revokeSession);
router.get('/activity', authenticate, authController.getActivityLogs);
router.get('/notifications/preferences', authenticate, authController.getNotificationPreferences);
router.put('/notifications/preferences', authenticate, authController.updateNotificationPreferences);

module.exports = router;
