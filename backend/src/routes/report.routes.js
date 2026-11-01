const router = require('express').Router();
const reportController = require('../modules/report/report.controller');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validate } = require('../middleware/validate');
const { shareReportSchema } = require('../validators/hospital.validator');

router.post('/upload', authenticate, upload.single('file'), reportController.uploadReport);
router.get('/my', authenticate, reportController.getMyReports);
router.get('/shared', authenticate, reportController.getSharedReports);
router.get('/download-fallback/:path(*)', (req, res) => {
  const filePath = require('path').join(__dirname, '../../uploads', req.params.path);
  res.download(filePath);
});
router.get('/:id', authenticate, reportController.getReportById);
router.get('/:id/download', authenticate, reportController.getReportDownloadUrl);
router.post('/:id/share', authenticate, validate(shareReportSchema), reportController.shareReport);
router.get('/:id/shares', authenticate, reportController.getReportShares);
router.put('/access/:accessId/revoke', authenticate, reportController.revokeAccess);
router.delete('/:id', authenticate, reportController.deleteReport);

module.exports = router;
