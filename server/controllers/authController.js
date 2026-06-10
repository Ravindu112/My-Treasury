const jwt = require('jsonwebtoken');
const { User } = require('../models');

const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }
    const user = await User.create({ name, email, password });
    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.validatePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed.' });
  }
};

exports.getProfile = async (req, res) => {
  res.json({ user: req.user });
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const avatar = req.file ? req.file.filename : req.user.avatar;
    await req.user.update({ name, email, avatar });
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error: 'Profile update failed.' });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const users = await User.findAll({ attributes: ['id', 'name', 'email', 'avatar'] });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
};
