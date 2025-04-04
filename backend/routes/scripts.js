const express = require('express');
const router = express.Router();
const scriptController = require('../controllers/scriptController');

// 获取所有脚本
router.get('/', scriptController.getAllScripts);

// 创建脚本
router.post('/', scriptController.createScript);

// 获取单个脚本
router.get('/:id', scriptController.getScriptById);

// 更新脚本
router.put('/:id', scriptController.updateScript);

// 删除脚本
router.delete('/:id', scriptController.deleteScript);

// 运行脚本
router.post('/:id/run', scriptController.runScriptById);

// 停止脚本
router.post('/:id/stop', scriptController.stopScriptById);

// 获取脚本状态
router.get('/:id/status', scriptController.getScriptStatus);

// 获取脚本日志
router.get('/:id/log', scriptController.getScriptLog);

// 获取脚本内容
router.get('/:id/content', scriptController.getScriptContent);

// 保存脚本内容
router.put('/:id/content', scriptController.saveScriptContent);

module.exports = router; 