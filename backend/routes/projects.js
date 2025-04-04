const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// 获取所有项目
router.get('/', projectController.getAllProjects);

// 获取单个项目
router.get('/:id', projectController.getProject);

// 获取项目详情信息
router.get('/:id/info', projectController.getProjectInfo);

// 创建项目
router.post('/', projectController.createProject);

// 更新项目
router.put('/:id', projectController.updateProject);

// 删除项目
router.delete('/:id', projectController.deleteProject);

// 启动项目
router.post('/:id/start', projectController.startProject);

// 停止项目
router.post('/:id/stop', projectController.stopProject);

// 构建项目
router.post('/:id/build', projectController.buildProject);

// 获取项目状态
router.get('/:id/status', projectController.getProjectStatus);

module.exports = router; 