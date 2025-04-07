const express = require('express');
const router = express.Router();
const systemctlController = require('../controllers/systemctlController');

// 获取所有systemd服务
router.get('/', systemctlController.getAllServices);

// 获取单个服务状态
router.get('/:id', systemctlController.getServiceStatus);

// 启动服务
router.post('/:id/start', systemctlController.startService);

// 停止服务
router.post('/:id/stop', systemctlController.stopService);

// 重启服务
router.post('/:id/restart', systemctlController.restartService);

// 重载服务配置
router.post('/:id/reload', systemctlController.reloadService);

// 启用服务（开机自启）
router.post('/:id/enable', systemctlController.enableService);

// 禁用服务（禁止开机自启）
router.post('/:id/disable', systemctlController.disableService);

// 切换服务隐藏状态
router.post('/:id/visibility', systemctlController.toggleServiceVisibility);

// 获取服务日志
router.get('/:id/logs', systemctlController.getServiceLogs);

// 获取服务脚本内容
router.get('/:id/script', systemctlController.getServiceScript);

// 更新服务脚本内容
router.post('/:id/script', systemctlController.updateServiceScript);

// 获取所有标签
router.get('/tags', systemctlController.getAllTags);

// 获取服务标签
router.get('/:id/tags', systemctlController.getServiceTags);

// 更新服务标签
router.put('/:id/tags', systemctlController.updateServiceTags);

// 创建新服务
router.post('/', systemctlController.createService);

// 删除服务
router.delete('/:id', systemctlController.deleteService);

// 创建项目服务
router.post('/project', systemctlController.createProjectService);

// 创建脚本服务
router.post('/script', systemctlController.createScriptService);

module.exports = router; 