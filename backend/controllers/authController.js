const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// 系统配置路径
const systemConfigPath = path.resolve(__dirname, '../../config/system.json');

// 密钥
const SECRET_KEY = 'server-management-secret-key';

// 读取系统配置
const getSystemConfig = async () => {
  try {
    const data = await fs.readJson(systemConfigPath);
    return data;
  } catch (error) {
    console.error('读取系统配置失败:', error);
    return { 
      auth: {
        enabled: true,
        users: []
      }
    };
  }
};

// 保存系统配置
const saveSystemConfig = async (data) => {
  try {
    await fs.writeJson(systemConfigPath, data, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('保存系统配置失败:', error);
    return false;
  }
};

// 生成SHA1哈希
const generateHash = (password) => {
  return crypto.createHash('sha1').update(password).digest('hex');
};

// 生成JWT令牌
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.username,
      role: user.role
    }, 
    SECRET_KEY, 
    { expiresIn: '1h' }
  );
};

// 登录
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码必填' });
    }
    
    const config = await getSystemConfig();
    
    // 检查是否启用身份验证
    if (!config.auth || !config.auth.enabled) {
      return res.status(403).json({ message: '身份验证已禁用' });
    }
    
    // 查找用户
    const user = config.auth.users.find(u => u.username === username);
    
    if (!user) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }
    
    // 验证密码
    const passwordHash = generateHash(password);
    
    if (passwordHash !== user.passwordHash) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }
    
    // 更新最后登录时间
    const index = config.auth.users.findIndex(u => u.username === username);
    config.auth.users[index].lastLogin = new Date().toISOString();
    await saveSystemConfig(config);
    
    // 生成令牌
    const token = generateToken(user);
    
    res.status(200).json({
      user: {
        username: user.username,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: '登录失败', error: error.message });
  }
};

// 验证令牌
exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : undefined;
    
    if (!token) {
      return res.status(401).json({ message: '未提供授权令牌' });
    }
    
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: '无效的令牌' });
      }
      
      res.status(200).json({
        valid: true,
        user: {
          username: decoded.id,
          role: decoded.role
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: '验证令牌失败', error: error.message });
  }
};

// 更改密码
exports.changePassword = async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    
    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ message: '缺少必要的参数' });
    }
    
    const config = await getSystemConfig();
    
    // 查找用户
    const index = config.auth.users.findIndex(u => u.username === username);
    
    if (index === -1) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 验证当前密码
    const currentPasswordHash = generateHash(currentPassword);
    
    if (currentPasswordHash !== config.auth.users[index].passwordHash) {
      return res.status(401).json({ message: '当前密码不正确' });
    }
    
    // 更新密码
    config.auth.users[index].passwordHash = generateHash(newPassword);
    
    // 保存配置
    await saveSystemConfig(config);
    
    res.status(200).json({ message: '密码已更新' });
  } catch (error) {
    res.status(500).json({ message: '更改密码失败', error: error.message });
  }
};

// 获取用户列表（仅管理员）
exports.getUsers = async (req, res) => {
  try {
    // 检查权限（应由中间件完成）
    
    const config = await getSystemConfig();
    
    // 移除密码哈希等敏感信息
    const users = config.auth.users.map(user => ({
      username: user.username,
      role: user.role,
      lastLogin: user.lastLogin
    }));
    
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: '获取用户列表失败', error: error.message });
  }
};

// 添加新用户（仅管理员）
exports.createUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password || !role) {
      return res.status(400).json({ message: '缺少必要的用户信息' });
    }
    
    const config = await getSystemConfig();
    
    // 检查用户名是否已存在
    if (config.auth.users.some(u => u.username === username)) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    
    // 添加新用户
    config.auth.users.push({
      username,
      passwordHash: generateHash(password),
      role,
      lastLogin: null
    });
    
    // 保存配置
    await saveSystemConfig(config);
    
    res.status(201).json({ 
      username, 
      role,
      message: '用户已创建' 
    });
  } catch (error) {
    res.status(500).json({ message: '创建用户失败', error: error.message });
  }
};

// 删除用户（仅管理员）
exports.deleteUser = async (req, res) => {
  try {
    const { username } = req.params;
    
    const config = await getSystemConfig();
    
    // 查找用户
    const index = config.auth.users.findIndex(u => u.username === username);
    
    if (index === -1) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 不允许删除最后一个管理员
    if (
      config.auth.users[index].role === 'admin' && 
      config.auth.users.filter(u => u.role === 'admin').length === 1
    ) {
      return res.status(400).json({ message: '不能删除最后一个管理员用户' });
    }
    
    // 删除用户
    config.auth.users.splice(index, 1);
    
    // 保存配置
    await saveSystemConfig(config);
    
    res.status(200).json({ message: '用户已删除', username });
  } catch (error) {
    res.status(500).json({ message: '删除用户失败', error: error.message });
  }
}; 