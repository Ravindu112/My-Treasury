const router = require('express').Router();
const expenseController = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate);

router.post('/:taskId/expenses', upload.single('billImage'), expenseController.create);
router.get('/:taskId/expenses', expenseController.listByTask);
router.delete('/:taskId/expenses/:expenseId', expenseController.remove);
router.get('/project/:projectId/expenses', expenseController.listByProject);

module.exports = router;
