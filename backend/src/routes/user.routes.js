const router = require('express').Router();
const userController = require('../modules/user/user.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/', authenticate, requireRole('super_admin'), userController.getAllUsers);
router.get('/:id', authenticate, userController.getUserById);
router.put('/:id', authenticate, userController.updateUser);
router.put('/:id/status', authenticate, requireRole('super_admin'), userController.toggleUserStatus);
router.delete('/:id', authenticate, requireRole('super_admin'), userController.deleteUser);

module.exports = router;
