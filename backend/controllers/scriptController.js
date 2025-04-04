const fs = require('fs-extra');
const path = require('path');
const { exec, spawn } = require('child_process');
const util = require('util');
const pidusage = require('pidusage');
const childProcess = require('child_process');

const execPromise = util.promisify(exec);

// 脚本配置文件路径
const scriptsConfigPath = path.resolve(__dirname, '../../config/scripts.json');
// 项目根路径，用于解析相对路径
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// 解析脚本路径（支持绝对路径和相对路径）
const resolveScriptPath = (scriptPath) => {
  if (!scriptPath) {
    return null;
  }
  
  // 如果是绝对路径，直接返回
  if (path.isAbsolute(scriptPath)) {
    return scriptPath;
  }
  
  // 相对路径可能的基础目录
  const baseDirs = [
    PROJECT_ROOT,                        // 项目根目录
    path.join(PROJECT_ROOT, 'service'),  // 服务目录
    path.join(PROJECT_ROOT, 'whisperx'), // whisperx目录
    path.join(PROJECT_ROOT, 'scripts'),  // 脚本目录
    path.join(PROJECT_ROOT, '..'),       // 上一级目录
    '/home/gonghaojing/jing/server',     // 服务器根目录
    '/home/gonghaojing/jing',            // 用户目录
  ];
  
  // 尝试在各个基础目录中解析路径
  for (const baseDir of baseDirs) {
    // 尝试直接添加路径
    let fullPath = path.join(baseDir, scriptPath);
    if (fs.existsSync(fullPath)) {
      console.log(`找到脚本(直接路径): ${scriptPath} => ${fullPath}`);
      return fullPath;
    }
    
    // 尝试移除前导的./和../
    fullPath = path.join(baseDir, scriptPath.replace(/^\.\/|^\.\.\/|^\//g, ''));
    if (fs.existsSync(fullPath)) {
      console.log(`找到脚本(规范化路径): ${scriptPath} => ${fullPath}`);
      return fullPath;
    }
    
    // 如果是以../开头的相对路径，尝试特殊处理
    if (scriptPath.startsWith('../')) {
      const parts = scriptPath.split('/');
      const restPath = parts.slice(1).join('/');
      fullPath = path.join(baseDir, restPath);
      if (fs.existsSync(fullPath)) {
        console.log(`找到脚本(特殊相对路径): ${scriptPath} => ${fullPath}`);
        return fullPath;
      }
    }
  }
  
  // 如果所有尝试都失败，尝试直接搜索文件名
  const fileName = path.basename(scriptPath);
  for (const baseDir of baseDirs) {
    try {
      // 递归查找文件
      const findResult = childProcess.execSync(`find ${baseDir} -name "${fileName}" -type f | head -1`, { encoding: 'utf8' }).trim();
      if (findResult) {
        console.log(`通过搜索找到脚本: ${scriptPath} => ${findResult}`);
        return findResult;
      }
    } catch (error) {
      // 忽略错误，继续尝试
    }
  }
  
  // 如果所有尝试都失败，返回相对于项目根目录的路径
  console.warn(`警告: 脚本路径无法解析，使用相对于项目根目录的路径: ${scriptPath}`);
  return path.join(PROJECT_ROOT, scriptPath.replace(/^\.\/|^\.\.\/|^\//g, ''));
};

// 读取脚本配置
const getScriptsConfig = async () => {
  try {
    // 确保配置目录存在
    const configDir = path.dirname(scriptsConfigPath);
    await fs.ensureDir(configDir);
    
    // 如果配置文件不存在或损坏，创建新的配置文件
    if (!await fs.pathExists(scriptsConfigPath)) {
      const defaultConfig = { scripts: [] };
      await fs.writeJson(scriptsConfigPath, defaultConfig, { spaces: 2 });
      return defaultConfig;
    }
    
    // 读取配置文件
    const data = await fs.readJson(scriptsConfigPath);
    
    // 确保配置包含scripts数组
    if (!data || !data.scripts) {
      console.warn('脚本配置文件格式不正确，重置为默认值');
      const defaultConfig = { scripts: [] };
      await fs.writeJson(scriptsConfigPath, defaultConfig, { spaces: 2 });
      return defaultConfig;
    }
    
    // 确保scripts是数组
    if (!Array.isArray(data.scripts)) {
      console.warn('脚本列表不是数组，重置为空数组');
      data.scripts = [];
      await fs.writeJson(scriptsConfigPath, data, { spaces: 2 });
    }
    
    return data;
  } catch (error) {
    console.error('读取脚本配置失败:', error);
    return { scripts: [] };
  }
};

// 保存脚本配置
const saveScriptsConfig = async (config) => {
  try {
    await fs.writeJson(scriptsConfigPath, config, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('保存脚本配置失败:', error);
    return false;
  }
};

// 初始化自启动脚本
exports.initAutoStartScripts = async () => {
  try {
    const config = await getScriptsConfig();
    const autostartScripts = config.scripts.filter(script => script.autostart);
    
    console.log(`找到 ${autostartScripts.length} 个自启动脚本`);
    
    for (const script of autostartScripts) {
      try {
        console.log(`正在启动自启脚本: ${script.name}`);
        await runScript(script.id);
      } catch (error) {
        console.error(`自启脚本启动失败: ${script.name}`, error);
      }
    }
    
    return autostartScripts.length;
  } catch (error) {
    console.error('初始化自启动脚本失败:', error);
    return 0;
  }
};

// 获取所有脚本
exports.getAllScripts = async (req, res) => {
  try {
    const config = await getScriptsConfig();
    
    // 确保返回数组
    const scripts = Array.isArray(config.scripts) ? config.scripts : [];
    
    // 记录脚本数量到日志
    console.log(`获取到 ${scripts.length} 个脚本`);
    
    res.status(200).json(scripts);
  } catch (error) {
    console.error('获取脚本列表失败:', error);
    res.status(500).json({ message: '获取脚本列表失败', error: error.message });
  }
};

// 获取单个脚本
exports.getScriptById = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await getScriptsConfig();
    
    const script = config.scripts.find(s => s.id === id);
    
    if (!script) {
      return res.status(404).json({ message: '脚本不存在' });
    }
    
    res.status(200).json(script);
  } catch (error) {
    res.status(500).json({ message: '获取脚本失败', error: error.message });
  }
};

// 创建脚本
exports.createScript = async (req, res) => {
  try {
    const scriptData = req.body;
    
    if (!scriptData.id || !scriptData.name || !scriptData.path) {
      return res.status(400).json({ message: '缺少必要参数' });
    }
    
    const config = await getScriptsConfig();
    
    // 检查脚本ID是否已存在
    if (config.scripts.some(s => s.id === scriptData.id)) {
      return res.status(400).json({ message: '脚本ID已存在' });
    }
    
    // 解析脚本路径
    const scriptPath = resolveScriptPath(scriptData.path);
    
    // 添加新脚本，保存绝对路径以避免解析问题
    const newScript = {
      id: scriptData.id,
      name: scriptData.name,
      description: scriptData.description || '',
      path: scriptPath, // 保存绝对路径
      originalPath: scriptData.path, // 保存原始路径以供参考
      type: scriptData.type || 'shell',
      autostart: Boolean(scriptData.autostart),
      lastRunTime: null,
      lastRunStatus: null
    };
    
    // 如果有脚本内容，创建脚本文件
    if (scriptData.content && !await fs.pathExists(scriptPath)) {
      const dir = path.dirname(scriptPath);
      
      // 确保目录存在
      await fs.ensureDir(dir);
      
      // 写入脚本内容
      await fs.writeFile(scriptPath, scriptData.content);
      
      // 如果是shell脚本，设置执行权限
      if (scriptData.type === 'shell' || scriptPath.endsWith('.sh')) {
        await execPromise(`chmod +x "${scriptPath}"`);
      }
    }
    
    config.scripts.push(newScript);
    await saveScriptsConfig(config);
    
    res.status(201).json({
      ...newScript,
      message: '脚本创建成功',
      pathResolved: true
    });
  } catch (error) {
    res.status(500).json({ message: '创建脚本失败', error: error.message });
  }
};

// 更新脚本
exports.updateScript = async (req, res) => {
  try {
    const { id } = req.params;
    const scriptData = req.body;
    
    const config = await getScriptsConfig();
    const index = config.scripts.findIndex(s => s.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: '脚本不存在' });
    }
    
    // 获取当前脚本数据
    const currentScript = config.scripts[index];
    
    // 更新脚本数据
    config.scripts[index] = {
      ...currentScript,
      ...scriptData,
      id // 确保ID不变
    };
    
    await saveScriptsConfig(config);
    
    res.status(200).json(config.scripts[index]);
  } catch (error) {
    res.status(500).json({ message: '更新脚本失败', error: error.message });
  }
};

// 删除脚本
exports.deleteScript = async (req, res) => {
  try {
    const { id } = req.params;
    
    const config = await getScriptsConfig();
    const index = config.scripts.findIndex(s => s.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: '脚本不存在' });
    }
    
    // 删除脚本
    config.scripts.splice(index, 1);
    await saveScriptsConfig(config);
    
    res.status(200).json({ message: '脚本删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除脚本失败', error: error.message });
  }
};

// PID文件目录
const PID_DIR = path.resolve(__dirname, '../../temp/pids');
fs.ensureDirSync(PID_DIR);

// 获取脚本PID文件路径
const getScriptPidFile = (scriptId) => {
  return path.join(PID_DIR, `script_${scriptId}.pid`);
};

// 获取脚本日志文件路径
const getScriptLogFile = (scriptId) => {
  return path.resolve(__dirname, `../../logs/script_${scriptId}.log`);
};

// 检查脚本是否在运行
const isScriptRunning = async (scriptId) => {
  try {
    const pidFile = getScriptPidFile(scriptId);
    
    if (!await fs.pathExists(pidFile)) {
      return false;
    }
    
    const pid = (await fs.readFile(pidFile, 'utf8')).trim();
    
    // 检查进程是否存在
    try {
      process.kill(parseInt(pid), 0);
      return true;
    } catch (e) {
      // 进程不存在，清理陈旧的PID文件
      await fs.remove(pidFile);
      return false;
    }
  } catch (error) {
    console.error(`检查脚本运行状态失败:`, error);
    return false;
  }
};

// 获取脚本使用的端口
const getScriptPorts = async (pid) => {
  try {
    const { stdout } = await execPromise(`lsof -i -P -n -a -p ${pid} | grep LISTEN | awk '{print $9}' | cut -d ':' -f 2`);
    if (!stdout.trim()) return [];
    
    return stdout.trim().split('\n').map(port => parseInt(port));
  } catch (error) {
    console.error('获取脚本端口失败:', error);
    return [];
  }
};

// 运行脚本
const runScript = async (scriptId) => {
  const config = await getScriptsConfig();
  const script = config.scripts.find(s => s.id === scriptId);
  
  if (!script) {
    throw new Error('脚本不存在');
  }
  
  // 检查脚本是否已在运行
  if (await isScriptRunning(scriptId)) {
    throw new Error('脚本已在运行');
  }
  
  // 解析脚本路径，支持相对路径
  const scriptPath = resolveScriptPath(script.path);
  
  // 检查脚本文件是否存在
  if (!await fs.pathExists(scriptPath)) {
    throw new Error(`脚本文件不存在: ${scriptPath} (原始路径: ${script.path})`);
  }
  
  // 准备运行环境
  let command, args;
  
  switch (script.type) {
    case 'shell':
      command = scriptPath;
      args = [];
      
      // 确保脚本有执行权限
      await execPromise(`chmod +x "${scriptPath}"`);
      break;
    case 'python':
      command = 'python3';
      args = [scriptPath];
      break;
    case 'node':
      command = 'node';
      args = [scriptPath];
      break;
    default:
      throw new Error(`不支持的脚本类型: ${script.type}`);
  }
  
  // 准备输出日志
  const logFile = getScriptLogFile(scriptId);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  // 在日志中添加时间戳
  const timestamp = new Date().toISOString();
  logStream.write(`\n========== 脚本启动: ${timestamp} ==========\n`);
  logStream.write(`脚本路径: ${scriptPath}\n`);
  
  // 运行脚本
  const child = spawn(command, args, {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // 将输出写入日志
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  
  // 保存PID
  const pidFile = getScriptPidFile(scriptId);
  await fs.writeFile(pidFile, child.pid.toString());
  
  // 更新脚本状态
  const scriptIndex = config.scripts.findIndex(s => s.id === scriptId);
  config.scripts[scriptIndex].lastRunTime = new Date().toISOString();
  
  // 让子进程独立运行
  child.unref();
  
  // 设置状态检查
  child.on('exit', async (code) => {
    try {
      // 在日志中添加退出信息
      const exitTimestamp = new Date().toISOString();
      logStream.write(`\n========== 脚本退出: ${exitTimestamp}, 退出码: ${code} ==========\n`);
      logStream.end();
      
      // 更新脚本状态
      const updatedConfig = await getScriptsConfig();
      const updatedScriptIndex = updatedConfig.scripts.findIndex(s => s.id === scriptId);
      
      if (updatedScriptIndex !== -1) {
        updatedConfig.scripts[updatedScriptIndex].lastRunStatus = code === 0 ? 'success' : 'error';
        await saveScriptsConfig(updatedConfig);
      }
      
      // 清理PID文件
      await fs.remove(pidFile);
    } catch (error) {
      console.error(`更新脚本退出状态失败: ${scriptId}`, error);
    }
  });
  
  // 保存配置
  await saveScriptsConfig(config);
  
  return {
    pid: child.pid,
    logFile
  };
};

// 停止脚本
const stopScript = async (scriptId) => {
  const pidFile = getScriptPidFile(scriptId);
  
  if (!await fs.pathExists(pidFile)) {
    throw new Error('脚本未运行');
  }
  
  const pid = parseInt((await fs.readFile(pidFile, 'utf8')).trim());
  
  try {
    // 发送终止信号
    process.kill(pid, 'SIGTERM');
    
    // 等待进程结束
    let retry = 10;
    while (retry > 0) {
      try {
        process.kill(pid, 0);
        await new Promise(resolve => setTimeout(resolve, 300));
        retry--;
      } catch (e) {
        // 进程已结束
        break;
      }
    }
    
    // 如果进程仍然存在，强制终止
    if (retry === 0) {
      process.kill(pid, 'SIGKILL');
    }
    
    // 清理PID文件
    await fs.remove(pidFile);
    
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') {
      // 进程不存在，清理PID文件
      await fs.remove(pidFile);
      return true;
    }
    throw error;
  }
};

// 运行脚本API
exports.runScriptById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 运行脚本
    const result = await runScript(id);
    
    res.status(200).json({
      message: '脚本启动成功',
      pid: result.pid,
      logFile: result.logFile
    });
  } catch (error) {
    res.status(500).json({ message: '运行脚本失败', error: error.message });
  }
};

// 停止脚本API
exports.stopScriptById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 停止脚本
    await stopScript(id);
    
    res.status(200).json({ message: '脚本已停止' });
  } catch (error) {
    res.status(500).json({ message: '停止脚本失败', error: error.message });
  }
};

// 获取脚本日志
exports.getScriptLog = async (req, res) => {
  try {
    const { id } = req.params;
    const logFile = getScriptLogFile(id);
    
    if (!await fs.pathExists(logFile)) {
      return res.status(404).json({ message: '脚本日志不存在' });
    }
    
    // 读取日志内容
    // 默认返回最后100行
    const lines = parseInt(req.query.lines || 100);
    const { stdout } = await execPromise(`tail -n ${lines} "${logFile}"`);
    
    res.status(200).json({ log: stdout });
  } catch (error) {
    res.status(500).json({ message: '获取脚本日志失败', error: error.message });
  }
};

// 获取脚本内容
exports.getScriptContent = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await getScriptsConfig();
    
    const script = config.scripts.find(s => s.id === id);
    
    if (!script) {
      return res.status(404).json({ message: '脚本不存在' });
    }
    
    // 解析脚本路径
    const scriptPath = resolveScriptPath(script.path);
    
    // 检查脚本文件是否存在
    if (!await fs.pathExists(scriptPath)) {
      return res.status(404).json({ 
        message: '脚本文件不存在', 
        details: {
          path: script.path,
          resolvedPath: scriptPath
        }
      });
    }
    
    // 读取脚本内容
    const content = await fs.readFile(scriptPath, 'utf8');
    
    res.status(200).json({ content });
  } catch (error) {
    res.status(500).json({ message: '获取脚本内容失败', error: error.message });
  }
};

// 保存脚本内容
exports.saveScriptContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (content === undefined) {
      return res.status(400).json({ message: '缺少脚本内容' });
    }
    
    const config = await getScriptsConfig();
    const script = config.scripts.find(s => s.id === id);
    
    if (!script) {
      return res.status(404).json({ message: '脚本不存在' });
    }
    
    // 解析脚本路径
    const scriptPath = resolveScriptPath(script.path);
    
    // 检查目录是否存在，如果不存在则创建
    const scriptDir = path.dirname(scriptPath);
    await fs.ensureDir(scriptDir);
    
    // 保存脚本内容
    await fs.writeFile(scriptPath, content);
    
    // 如果是shell脚本，确保有执行权限
    if (script.type === 'shell' || scriptPath.endsWith('.sh')) {
      await execPromise(`chmod +x "${scriptPath}"`);
    }
    
    res.status(200).json({ 
      message: '脚本内容保存成功',
      path: scriptPath
    });
  } catch (error) {
    res.status(500).json({ message: '保存脚本内容失败', error: error.message });
  }
};

// 获取脚本状态
exports.getScriptStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await getScriptsConfig();
    
    const script = config.scripts.find(s => s.id === id);
    
    if (!script) {
      return res.status(404).json({ message: '脚本不存在' });
    }
    
    // 检查脚本是否在运行
    const running = await isScriptRunning(id);
    
    // 初始化状态对象
    const status = {
      id: script.id,
      name: script.name,
      running,
      lastRunTime: script.lastRunTime,
      lastRunStatus: script.lastRunStatus,
      pid: null,
      uptime: null,
      memory: null,
      cpu: null,
      ports: []
    };
    
    // 如果脚本在运行，获取更多信息
    if (running) {
      const pidFile = getScriptPidFile(id);
      const pid = parseInt((await fs.readFile(pidFile, 'utf8')).trim());
      
      status.pid = pid;
      
      try {
        // 获取进程使用情况
        const usage = await pidusage(pid);
        
        status.memory = `${Math.round(usage.memory / (1024 * 1024) * 100) / 100} MB`;
        status.cpu = `${Math.round(usage.cpu * 100) / 100}%`;
        
        // 计算运行时间
        const now = Date.now();
        const elapsed = now - usage.elapsed;
        
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        status.uptime = `${days}天 ${hours % 24}小时 ${minutes % 60}分钟 ${seconds % 60}秒`;
        status.startTime = new Date(now - elapsed).toISOString();
        
        // 获取端口
        status.ports = await getScriptPorts(pid);
      } catch (error) {
        console.error(`获取脚本状态信息失败: ${id}`, error);
      }
    }
    
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({ message: '获取脚本状态失败', error: error.message });
  }
}; 