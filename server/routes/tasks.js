const router = require('express').Router();
const taskController = require('../controllers/taskController');
const { authenticate, requireProjectRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/projects/:projectId/tasks', taskController.list);
router.post('/projects/:projectId/tasks', requireProjectRole('treasurer', 'sub_treasurer'), taskController.create);
router.put('/projects/:projectId/tasks/:taskId', requireProjectRole('treasurer', 'sub_treasurer'), taskController.update);
router.delete('/projects/:projectId/tasks/:taskId', requireProjectRole('treasurer', 'sub_treasurer'), taskController.remove);

module.exports = router;
