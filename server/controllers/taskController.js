const { Task, Project } = require('../models');

exports.create = async (req, res) => {
  try {
    const { name, description, allocatedCost, assignedTo } = req.body;
    const project = await Project.findByPk(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    const tasks = await Task.findAll({ where: { projectId: project.id } });
    const totalAllocated = tasks.reduce((sum, t) => sum + (t.allocatedCost || 0), 0);
    const available = project.totalBudget - totalAllocated;
    if (allocatedCost > available) {
      return res.status(400).json({ error: 'Allocated cost exceeds remaining budget.' });
    }
    if (!assignedTo) {
      return res.status(400).json({ error: 'Task must be assigned to a member.' });
    }
    const task = await Task.create({
      projectId: project.id,
      name,
      description,
      allocatedCost,
      assignedTo,
    });
    await project.update({ remainingBudget: project.totalBudget - totalAllocated - allocatedCost });
    res.status(201).json({ task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, description, allocatedCost, assignedTo, status } = req.body;
    const task = await Task.findByPk(req.params.taskId, { include: [Project] });
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    const oldCost = task.allocatedCost;
    if (allocatedCost && allocatedCost !== oldCost) {
      const project = task.Project;
      const tasks = await Task.findAll({ where: { projectId: project.id } });
      const otherAllocated = tasks
        .filter((t) => t.id !== task.id)
        .reduce((sum, t) => sum + (t.allocatedCost || 0), 0);
      const newRemaining = project.totalBudget - otherAllocated - allocatedCost;
      if (newRemaining < 0) {
        return res.status(400).json({ error: 'Allocated cost exceeds remaining budget.' });
      }
      await task.update({ name, description, allocatedCost, assignedTo, status });
      await project.update({ remainingBudget: newRemaining });
    } else {
      await task.update({ name, description, allocatedCost, assignedTo, status });
    }
    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task.' });
  }
};

exports.list = async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { projectId: req.params.projectId },
      include: [{ model: require('../models').User, as: 'assignee', attributes: ['id', 'name', 'email', 'avatar'] }],
    });
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list tasks.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.taskId, { include: [Project] });
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    const project = task.Project;
    await task.destroy();
    const tasks = await Task.findAll({ where: { projectId: project.id } });
    const totalAllocated = tasks.reduce((sum, t) => sum + (t.allocatedCost || 0), 0);
    await project.update({ remainingBudget: project.totalBudget - totalAllocated });
    res.json({ message: 'Task deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task.' });
  }
};
