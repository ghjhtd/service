const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const winston = require('winston');

// 导入应用程序
const app = require('./app');

// 导入控制器初始化函数
const { initCronTasks } = require('./controllers/cronController');
const { initAutoStartScripts } = require('./controllers/scriptController');

// 导入配置
let systemConfig;
try {
  systemConfig = require('../config/system.json').system;
} catch (error) {
  console.error('无法加载系统配置文件，使用默认配置');
  systemConfig = {
    port: 9999,
    logsDir: './logs',
    name: '服务器管理系统',
    autoStartEnabled: true,
    enableScheduler: true
  };
}

// 确保日志目录存在
const logsDir = path.resolve(__dirname, '..', systemConfig.logsDir || './logs');
fs.ensureDirSync(logsDir);

// 配置日志
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'server-management' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log') 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// 设置端口
const PORT = systemConfig.port || 9999;

// 初始化系统
const initSystem = async () => {
  try {
    // 保存进程ID
    const pid = process.pid.toString();
    fs.writeFileSync(path.resolve(__dirname, '../backend.pid'), pid);
    
    logger.info('服务器进程ID:', pid);
    
    // 初始化定时任务
    if (systemConfig.enableScheduler) {
      logger.info('正在初始化定时任务...');
      const tasksCount = await initCronTasks();
      logger.info(`已初始化 ${tasksCount} 个定时任务`);
    } else {
      logger.info('定时任务调度程序已禁用');
    }
    
    // 初始化自启动脚本
    if (systemConfig.autoStartEnabled) {
      logger.info('正在初始化自启动脚本...');
      await initAutoStartScripts();
    } else {
      logger.info('自动启动脚本功能已禁用');
    }
    
    logger.info('系统初始化完成');
  } catch (error) {
    logger.error('系统初始化失败:', error);
  }
};

// 启动服务器
app.listen(PORT, async () => {
  logger.info(`${systemConfig.name} 服务器已启动，运行在端口 ${PORT}`);
  console.log(`${systemConfig.name} 服务器已启动，运行在端口 ${PORT}`);
  
  // 初始化系统
  await initSystem();
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  console.error('未捕获的异常:', error);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
  console.error('未处理的Promise拒绝:', reason);
});

// 处理进程终止信号
process.on('SIGTERM', () => {
  logger.info('接收到SIGTERM信号，正在关闭服务器...');
  console.log('接收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

module.exports = app; 