const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

// 获取系统信息
router.get('/info', systemController.getSystemInfo);

// 获取系统配置
router.get('/config', systemController.getConfig);

// 更新系统配置
router.put('/config', systemController.updateSystemConfig);

// 获取磁盘使用情况
router.get('/diskusage', systemController.getDiskUsage);

// 获取内存使用情况
router.get('/memory', systemController.getMemoryUsage);

// 获取CPU使用情况
router.get('/cpu', systemController.getCpuUsage);

// 获取正在运行的进程
router.get('/processes', systemController.getProcessList);

// 获取文件系统结构
router.get('/filesystem', systemController.getFileSystem);

// 获取可执行文件列表
router.get('/executables', systemController.getExecutableFiles);

// 获取文件内容
router.get('/file', systemController.getFileContent);

// 保存文件内容
router.post('/file', systemController.saveFileContent);

// 重启系统服务
router.post('/restart', systemController.restartService);

// 执行系统命令
router.post('/execute', systemController.executeCommand);

module.exports = router; 