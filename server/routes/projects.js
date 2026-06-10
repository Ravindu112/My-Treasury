const router = require('express').Router();
const projectController = require('../controllers/projectController');
const { authenticate, requireProjectRole } = require('../middleware/auth');

router.use(authenticate);

router.post('/', projectController.create);
router.get('/', projectController.list);
router.get('/:projectId', projectController.getOne);
router.put('/:projectId/budget', requireProjectRole('treasurer', 'sub_treasurer'), projectController.updateBudget);
router.post('/:projectId/members', requireProjectRole('treasurer'), projectController.addMember);
router.put('/:projectId/members/:memberId', requireProjectRole('treasurer'), projectController.updateMemberRole);
router.delete('/:projectId/members/:memberId', requireProjectRole('treasurer'), projectController.removeMember);
router.delete('/:projectId', requireProjectRole('treasurer'), projectController.deleteProject);
router.post('/:projectId/recalculate', requireProjectRole('treasurer', 'sub_treasurer'), projectController.recalculateBudget);

module.exports = router;
