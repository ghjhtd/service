const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// 导入路由
const projectRoutes = require('./routes/projects');
const cronRoutes = require('./routes/cron');
const systemRoutes = require('./routes/system');
const authRoutes = require('./routes/auth');
const scriptRoutes = require('./routes/scripts');

// 创建Express应用
const app = express();

// 中间件
app.use(cors({
  origin: 'http://localhost:9999',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// 会话配置
app.use(session({
  secret: 'server-management-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600000 // 1小时
  }
}));

// 静态文件服务 - 前端构建文件
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/system', systemRoutes);

// 通用错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({
    status: 'error',
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 所有其他GET请求返回前端应用
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

module.exports = app; 