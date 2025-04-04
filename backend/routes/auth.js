const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 登录
router.post('/login', authController.login);

// 验证令牌
router.get('/verify', authController.verifyToken);

// 更改密码
router.post('/change-password', authController.changePassword);

// 获取用户列表（仅管理员）
router.get('/users', authController.getUsers);

// 添加新用户（仅管理员）
router.post('/users', authController.createUser);

// 删除用户（仅管理员）
router.delete('/users/:username', authController.deleteUser);

module.exports = router; 