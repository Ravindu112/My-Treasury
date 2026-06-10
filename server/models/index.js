const User = require('./User');
const Project = require('./Project');
const ProjectMember = require('./ProjectMember');
const Task = require('./Task');
const Expense = require('./Expense');
const BudgetLog = require('./BudgetLog');

User.belongsToMany(Project, { through: ProjectMember, foreignKey: 'userId' });
Project.belongsToMany(User, { through: ProjectMember, foreignKey: 'projectId' });
Project.hasMany(ProjectMember, { foreignKey: 'projectId' });
ProjectMember.belongsTo(User, { foreignKey: 'userId' });
ProjectMember.belongsTo(Project, { foreignKey: 'projectId' });

Project.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });

Task.belongsTo(Project, { foreignKey: 'projectId' });
Project.hasMany(Task, { foreignKey: 'projectId' });

Task.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' });

Expense.belongsTo(Task, { foreignKey: 'taskId' });
Task.hasMany(Expense, { foreignKey: 'taskId' });

Expense.belongsTo(User, { foreignKey: 'userId' });

BudgetLog.belongsTo(Project, { foreignKey: 'projectId' });
Project.hasMany(BudgetLog, { foreignKey: 'projectId' });

BudgetLog.belongsTo(User, { as: 'changer', foreignKey: 'changedBy' });

module.exports = { User, Project, ProjectMember, Task, Expense, BudgetLog };
