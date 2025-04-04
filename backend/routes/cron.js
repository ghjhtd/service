const express = require('express');
const router = express.Router();
const cronController = require('../controllers/cronController');

// 获取所有定时任务
router.get('/', cronController.getAllTasks);

// 获取单个定时任务
router.get('/:id', cronController.getTask);

// 创建新定时任务
router.post('/', cronController.createTask);

// 更新定时任务
router.put('/:id', cronController.updateTask);

// 删除定时任务
router.delete('/:id', cronController.deleteTask);

// 启用定时任务
router.post('/:id/enable', cronController.enableTask);

// 禁用定时任务
router.post('/:id/disable', cronController.disableTask);

// 手动运行定时任务
router.post('/:id/run', cronController.runTask);

module.exports = router; 