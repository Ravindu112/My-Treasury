const { Project, ProjectMember, User, BudgetLog, Task } = require('../models');

exports.create = async (req, res) => {
  try {
    const { name, description, totalBudget } = req.body;
    const project = await Project.create({
      name,
      description,
      totalBudget: totalBudget || 0,
      remainingBudget: totalBudget || 0,
      createdBy: req.user.id,
    });
    await ProjectMember.create({
      projectId: project.id,
      userId: req.user.id,
      role: 'treasurer',
    });
    res.status(201).json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project.' });
  }
};

exports.list = async (req, res) => {
  try {
    const memberships = await ProjectMember.findAll({
      where: { userId: req.user.id },
      include: [{ model: Project }],
    });
    const projects = memberships.map((m) => ({
      ...m.Project.toJSON(),
      role: m.role,
    }));
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list projects.' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.projectId, {
      include: [
        {
          model: ProjectMember,
          include: [{ model: User, attributes: ['id', 'name', 'email', 'avatar'] }],
        },
        {
          model: Task,
          include: [
            { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'avatar'] },
          ],
        },
        {
          model: BudgetLog,
          include: [{ model: User, as: 'changer', attributes: ['id', 'name'] }],
        },
      ],
    });
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    res.json({ project });
  } catch (error) {
    console.error('getOne error:', error);
    res.status(500).json({ error: 'Failed to fetch project.' });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const { newTotal, reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason is required for budget update.' });
    const project = await Project.findByPk(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    const previousTotal = project.totalBudget;
    const tasks = await Task.findAll({ where: { projectId: project.id } });
    const totalAllocated = tasks.reduce((sum, t) => sum + (t.allocatedCost || 0), 0);
    const newRemaining = newTotal - totalAllocated;
    if (newRemaining < 0) {
      return res.status(400).json({ error: 'Total budget cannot be less than already allocated amount.' });
    }
    await project.update({
      totalBudget: newTotal,
      remainingBudget: newRemaining,
    });
    await BudgetLog.create({
      projectId: project.id,
      previousTotal,
      newTotal: newTotal,
      changedBy: req.user.id,
      reason,
    });
    res.json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update budget.' });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { userId, role } = req.body;
    const project = await Project.findByPk(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    const existing = await ProjectMember.findOne({
      where: { projectId: project.id, userId },
    });
    if (existing) return res.status(400).json({ error: 'User is already a member.' });
    const member = await ProjectMember.create({
      projectId: project.id,
      userId,
      role: role || 'member',
    });
    res.status(201).json({ member });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member.' });
  }
};

exports.updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (role === 'treasurer') {
      return res.status(403).json({ error: 'Cannot promote to treasurer.' });
    }
    const membership = await ProjectMember.findByPk(req.params.memberId);
    if (!membership) return res.status(404).json({ error: 'Member not found.' });
    if (membership.projectId != req.params.projectId) {
      return res.status(400).json({ error: 'Member does not belong to this project.' });
    }
    await membership.update({ role });
    res.json({ member: membership });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update member role.' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const membership = await ProjectMember.findByPk(req.params.memberId);
    if (!membership) return res.status(404).json({ error: 'Member not found.' });
    if (membership.projectId != req.params.projectId) {
      return res.status(400).json({ error: 'Member does not belong to this project.' });
    }
    if (membership.role === 'treasurer') {
      return res.status(403).json({ error: 'Cannot remove the treasurer.' });
    }
    await membership.destroy();
    res.json({ message: 'Member removed.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member.' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    const { Task, Expense, ProjectMember, BudgetLog } = require('../models');
    const tasks = await Task.findAll({ where: { projectId: project.id } });
    for (const task of tasks) {
      await Expense.destroy({ where: { taskId: task.id } });
    }
    await Task.destroy({ where: { projectId: project.id } });
    await ProjectMember.destroy({ where: { projectId: project.id } });
    await BudgetLog.destroy({ where: { projectId: project.id } });
    await project.destroy();
    res.json({ message: 'Project deleted.' });
  } catch (error) {
    console.error('deleteProject error:', error);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
};

exports.recalculateBudget = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    const { Task, Expense } = require('../models');
    const tasks = await Task.findAll({
      where: { projectId: project.id },
      include: [{ model: Expense }],
    });
    for (const task of tasks) {
      const actualSpent = task.Expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      await task.update({ spent: actualSpent });
    }
    const totalAllocated = tasks.reduce((sum, t) => sum + (t.allocatedCost || 0), 0);
    const newRemaining = project.totalBudget - totalAllocated;
    await project.update({ remainingBudget: newRemaining });
    res.json({ project, totalAllocated, corrected: true });
  } catch (error) {
    console.error('recalculateBudget error:', error);
    res.status(500).json({ error: 'Failed to recalculate budget.' });
  }
};
