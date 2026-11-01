const router = require('express').Router();
const reviewController = require('../modules/review/review.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createReviewSchema } = require('../validators/hospital.validator');

router.post('/', authenticate, validate(createReviewSchema), reviewController.createReview);
router.get('/doctor/:doctorId', reviewController.getDoctorReviews);
router.delete('/:id', authenticate, requireRole('super_admin'), reviewController.deleteReview);

module.exports = router;
