const router = require('express').Router();
const reportController = require('../controllers/reportController');
const { authenticate, requireProjectRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/:projectId', requireProjectRole('treasurer', 'sub_treasurer'), reportController.getReportData);
router.get('/:projectId/pdf', requireProjectRole('treasurer', 'sub_treasurer'), reportController.downloadPDF);

module.exports = router;
