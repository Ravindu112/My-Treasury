const { Expense, Task, Project, ProjectMember } = require('../models');

exports.create = async (req, res) => {
  try {
    const { subject, description } = req.body;
    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }
    const task = await Task.findByPk(req.params.taskId, { include: [Project] });
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    const membership = await ProjectMember.findOne({
      where: { projectId: task.projectId, userId: req.user.id },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this project.' });
    if (!task.assignedTo) {
      return res.status(403).json({ error: 'This task has no assignee. Only the assigned person can add expenses.' });
    }
    if (task.assignedTo !== req.user.id) {
      return res.status(403).json({ error: 'Only the person assigned to this task can add expenses.' });
    }
    const existingExpenses = await Expense.findAll({ where: { taskId: task.id } });
    const currentSpent = existingExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const remaining = task.allocatedCost - currentSpent;
    if (amount > remaining) {
      return res.status(400).json({ error: 'Expense exceeds remaining task budget.' });
    }
    const billImage = req.file ? req.file.filename : null;
    const expense = await Expense.create({
      taskId: task.id,
      userId: req.user.id,
      subject,
      description,
      amount,
      billImage,
    });
    const allExpenses = await Expense.findAll({ where: { taskId: task.id } });
    const actualSpent = allExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    await task.update({ spent: actualSpent });
    res.status(201).json({ expense });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense.' });
  }
};

exports.listByTask = async (req, res) => {
  try {
    const expenses = await Expense.findAll({
      where: { taskId: req.params.taskId },
      include: [{ model: require('../models').User, attributes: ['id', 'name', 'email', 'avatar'] }],
    });
    res.json({ expenses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list expenses.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.expenseId, {
      include: [{ model: Task }],
    });
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });
    const task = expense.Task;
    const membership = await ProjectMember.findOne({
      where: { projectId: task.projectId, userId: req.user.id },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this project.' });
    const isAssignee = task.assignedTo === req.user.id;
    const isCreator = expense.userId === req.user.id;
    if (!isAssignee && !isCreator) {
      return res.status(403).json({ error: 'Not authorized to delete this expense.' });
    }
    await expense.destroy();
    const remaining = await Expense.findAll({ where: { taskId: task.id } });
    const actualSpent = remaining.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    await task.update({ spent: actualSpent });
    res.json({ message: 'Expense deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
};

exports.listByProject = async (req, res) => {
  try {
    const tasks = await Task.findAll({ where: { projectId: req.params.projectId } });
    const taskIds = tasks.map((t) => t.id);
    const expenses = await Expense.findAll({
      where: { taskId: taskIds },
      include: [
        { model: require('../models').User, attributes: ['id', 'name', 'email', 'avatar'] },
      ],
    });
    res.json({ expenses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list expenses.' });
  }
};
