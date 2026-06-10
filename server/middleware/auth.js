const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const requireProjectRole = (...roles) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID required.' });
      }
      const { ProjectMember } = require('../models');
      const membership = await ProjectMember.findOne({
        where: { projectId, userId: req.user.id },
      });
      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this project.' });
      }
      if (!roles.includes(membership.role)) {
        return res.status(403).json({ error: 'Insufficient permissions.' });
      }
      req.membership = membership;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Role check failed.' });
    }
  };
};

module.exports = { authenticate, requireProjectRole };
