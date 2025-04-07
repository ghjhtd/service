const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const os = require('os');

const execPromise = util.promisify(exec);

// 系统配置路径
const systemConfigPath = path.resolve(__dirname, '../../config/system.json');

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// 读取系统配置
const getSystemConfig = async () => {
  try {
    const data = await fs.readJson(systemConfigPath);
    return data;
  } catch (error) {
    console.error('读取系统配置失败:', error);
    return { system: {} };
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

// 获取系统基本信息
exports.getSystemInfo = async (req, res) => {
  try {
    const data = await getSystemConfig();
    
    // 获取系统信息
    const systemInfo = {
      ...data.system,
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024) * 100) / 100 + ' GB',
      freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024) * 100) / 100 + ' GB',
      uptime: Math.floor(os.uptime() / 86400) + ' 天 ' + Math.floor((os.uptime() % 86400) / 3600) + ' 小时',
      loadavg: os.loadavg()
    };
    
    res.status(200).json(systemInfo);
  } catch (error) {
    res.status(500).json({ message: '获取系统信息失败', error: error.message });
  }
};

// 获取系统配置
exports.getConfig = async (req, res) => {
  try {
    const config = await getSystemConfig();
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ message: '获取系统配置失败', error: error.message });
  }
};

// 更新系统配置
exports.updateSystemConfig = async (req, res) => {
  try {
    const updatedConfig = req.body;
    
    if (!updatedConfig) {
      return res.status(400).json({ message: '缺少配置数据' });
    }
    
    const data = await getSystemConfig();
    
    // 合并配置
    data.system = {
      ...data.system,
      ...updatedConfig
    };
    
    // 保存配置
    await saveSystemConfig(data);
    
    res.status(200).json(data.system);
  } catch (error) {
    res.status(500).json({ message: '更新系统配置失败', error: error.message });
  }
};

// 获取磁盘使用情况
exports.getDiskUsage = async (req, res) => {
  try {
    const { stdout } = await execPromise('df -h --output=source,size,used,avail,pcent,target | grep -v tmpfs');
    
    const lines = stdout.trim().split('\n');
    const headers = ['filesystem', 'size', 'used', 'avail', 'use%', 'mounted'];
    
    const disks = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      
      const disk = {};
      for (let i = 0; i < headers.length && i < parts.length; i++) {
        disk[headers[i]] = parts[i];
      }
      
      return disk;
    });
    
    res.status(200).json(disks);
  } catch (error) {
    res.status(500).json({ message: '获取磁盘使用情况失败', error: error.message });
  }
};

// 获取内存使用情况
exports.getMemoryUsage = async (req, res) => {
  try {
    const { stdout } = await execPromise('free -m');
    
    // 解析free -m的输出
    const lines = stdout.trim().split('\n');
    const headers = lines[0].split(/\s+/).filter(Boolean);
    
    const memoryInfo = {};
    
    lines.slice(1).forEach(line => {
      const values = line.split(/\s+/).filter(Boolean);
      const type = values[0].toLowerCase();
      
      memoryInfo[type] = {};
      
      headers.forEach((header, index) => {
        if (index > 0) {
          memoryInfo[type][header.toLowerCase()] = parseInt(values[index], 10);
        }
      });
    });
    
    res.status(200).json(memoryInfo);
  } catch (error) {
    res.status(500).json({ message: '获取内存使用情况失败', error: error.message });
  }
};

// 获取CPU使用情况
exports.getCpuUsage = async (req, res) => {
  try {
    const { stdout } = await execPromise('top -bn1 | grep "Cpu(s)"');
    
    // 解析CPU使用输出
    const cpuLine = stdout.trim();
    const cpuUsage = {};
    
    // 解析百分比值
    const percentages = cpuLine.match(/\d+\.\d+/g) || [];
    
    const cpuLabels = ['user', 'system', 'nice', 'idle', 'wait', 'hi', 'si', 'st'];
    
    percentages.forEach((value, index) => {
      if (index < cpuLabels.length) {
        cpuUsage[cpuLabels[index]] = parseFloat(value);
      }
    });
    
    res.status(200).json(cpuUsage);
  } catch (error) {
    res.status(500).json({ message: '获取CPU使用情况失败', error: error.message });
  }
};

// 获取正在运行的进程
exports.getRunningProcesses = async (req, res) => {
  try {
    const { stdout } = await execPromise('ps -eo pid,ppid,user,%cpu,%mem,cmd --sort=-%cpu | head -11');
    
    // 解析ps输出
    const lines = stdout.trim().split('\n');
    const headers = lines[0].split(/\s+/).filter(Boolean);
    
    const processes = lines.slice(1).map(line => {
      const parts = line.trim().split(/\s+/);
      const result = {};
      
      // 前5个字段是固定的
      for (let i = 0; i < 5; i++) {
        result[headers[i].toLowerCase()] = parts[i];
      }
      
      // 剩余部分是命令
      result[headers[5].toLowerCase()] = parts.slice(5).join(' ');
      
      return result;
    });
    
    res.status(200).json(processes);
  } catch (error) {
    res.status(500).json({ message: '获取运行进程失败', error: error.message });
  }
};

// 获取系统进程列表
exports.getProcessList = async (req, res) => {
  try {
    const { stdout } = await execPromise('ps -eo pid,ppid,user,%cpu,%mem,stime,time,cmd --sort=-%cpu | head -20');
    
    const lines = stdout.trim().split('\n');
    const headers = lines[0].trim().toLowerCase().split(/\s+/);
    const processes = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      const cmdIndex = line.indexOf(' ', line.indexOf(' ', line.indexOf(' ', line.indexOf(' ', line.indexOf(' ', line.indexOf(' ', line.indexOf(' ') + 1) + 1) + 1) + 1) + 1) + 1);
      const parts = line.substring(0, cmdIndex).trim().split(/\s+/);
      const cmd = line.substring(cmdIndex).trim();
      
      const process = {};
      for (let j = 0; j < headers.length - 1 && j < parts.length; j++) {
        process[headers[j]] = parts[j];
      }
      process[headers[headers.length - 1]] = cmd;
      
      processes.push(process);
    }
    
    res.status(200).json(processes);
  } catch (error) {
    res.status(500).json({ message: '获取进程列表失败', error: error.message });
  }
};

/**
 * 获取文件系统的目录结构
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getFileSystem = async (req, res) => {
  try {
    // 基础目录列表
    const baseDirectories = [
      PROJECT_ROOT,
      path.join(PROJECT_ROOT, 'service'),
      path.join(PROJECT_ROOT, 'scripts'),
      path.join(PROJECT_ROOT, 'whisperx'),
      '/home/gonghaojing/jing'
    ];
    
    // 生成树形结构
    const treeData = await Promise.all(
      baseDirectories.map(async (dirPath) => {
        if (!fs.existsSync(dirPath)) {
          return null;
        }
        return buildDirectoryTree(dirPath, 3); // 最多递归3层
      })
    );
    
    // 过滤掉不存在的目录
    const validTreeData = treeData.filter(item => item !== null);
    
    res.json(validTreeData);
  } catch (error) {
    console.error('获取文件系统结构失败:', error);
    res.status(500).json({ error: '获取文件系统结构失败', details: error.message });
  }
};

/**
 * 递归构建目录树
 * @param {string} dirPath - 目录路径
 * @param {number} maxDepth - 最大递归深度
 * @param {number} currentDepth - 当前递归深度
 * @returns {Object} 目录树结构
 */
async function buildDirectoryTree(dirPath, maxDepth = 3, currentDepth = 0) {
  try {
    const stats = await fs.stat(dirPath);
    const baseName = path.basename(dirPath);
    
    // 忽略隐藏目录和node_modules
    if (baseName.startsWith('.') || baseName === 'node_modules') {
      return null;
    }
    
    if (!stats.isDirectory()) {
      // 是否是shell脚本或配置文件
      const isShellScript = dirPath.endsWith('.sh');
      const isConfig = dirPath.endsWith('.json') || dirPath.endsWith('.yaml') || dirPath.endsWith('.yml');
      
      return {
        title: `${baseName}${isShellScript ? ' (脚本)' : isConfig ? ' (配置)' : ''}`,
        key: dirPath,
        isLeaf: true
      };
    }
    
    // 达到最大深度，不再递归
    if (currentDepth >= maxDepth) {
      return {
        title: baseName,
        key: dirPath,
        isLeaf: false,
        children: [{
          title: '...',
          key: `${dirPath}/...`,
          isLeaf: true
        }]
      };
    }
    
    // 获取目录内容
    const files = await fs.readdir(dirPath);
    
    // 递归处理子目录和文件
    const children = [];
    
    // 首先处理目录
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      try {
        const childStats = await fs.stat(fullPath);
        
        // 忽略隐藏文件和node_modules
        if (file.startsWith('.') || file === 'node_modules') {
          continue;
        }
        
        if (childStats.isDirectory()) {
          const childTree = await buildDirectoryTree(fullPath, maxDepth, currentDepth + 1);
          if (childTree) {
            children.push(childTree);
          }
        }
      } catch (error) {
        // 跳过无法访问的文件/目录
        continue;
      }
    }
    
    // 然后处理脚本和配置文件
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      try {
        const childStats = await fs.stat(fullPath);
        
        // 忽略隐藏文件
        if (file.startsWith('.')) {
          continue;
        }
        
        if (!childStats.isDirectory()) {
          // 只保留shell脚本和配置文件
          if (file.endsWith('.sh') || file.endsWith('.json') || file.endsWith('.yaml') || file.endsWith('.yml')) {
            const isShellScript = file.endsWith('.sh');
            const isConfig = file.endsWith('.json') || file.endsWith('.yaml') || file.endsWith('.yml');
            
            children.push({
              title: `${file}${isShellScript ? ' (脚本)' : isConfig ? ' (配置)' : ''}`,
              key: fullPath,
              isLeaf: true
            });
          }
        }
      } catch (error) {
        // 跳过无法访问的文件
        continue;
      }
    }
    
    return {
      title: baseName,
      key: dirPath,
      children: children.length > 0 ? children : [{ title: '(空目录)', key: `${dirPath}/empty`, isLeaf: true, disabled: true }]
    };
  } catch (error) {
    console.error(`构建目录树失败: ${dirPath}`, error);
    return null;
  }
}

// 获取文件内容
exports.getFileContent = async (req, res) => {
  try {
    const { filepath } = req.query;
    
    if (!filepath) {
      return res.status(400).json({ message: '缺少文件路径' });
    }
    
    // 检查文件是否存在
    if (!await fs.pathExists(filepath)) {
      return res.status(404).json({ message: '文件不存在' });
    }
    
    // 读取文件内容
    const content = await fs.readFile(filepath, 'utf8');
    
    res.status(200).json({ content });
  } catch (error) {
    res.status(500).json({ message: '获取文件内容失败', error: error.message });
  }
};

// 保存文件内容
exports.saveFileContent = async (req, res) => {
  try {
    const { filepath, content } = req.body;
    
    if (!filepath || content === undefined) {
      return res.status(400).json({ message: '缺少文件路径或内容' });
    }
    
    // 保存文件内容
    await fs.writeFile(filepath, content);
    
    // 如果是脚本文件，设置执行权限
    if (filepath.endsWith('.sh') || filepath.endsWith('.py')) {
      await execPromise(`chmod +x ${filepath}`);
    }
    
    res.status(200).json({ message: '文件内容保存成功' });
  } catch (error) {
    res.status(500).json({ message: '保存文件内容失败', error: error.message });
  }
};

// 重启系统服务
exports.restartService = async (req, res) => {
  try {
    const { rebuild } = req.body;
    
    // 获取脚本所在目录
    const scriptPath = path.resolve(__dirname, '../../scripts/restart.sh');
    
    // 检查脚本是否存在
    if (!await fs.pathExists(scriptPath)) {
      return res.status(404).json({ message: '重启脚本不存在' });
    }
    
    // 执行重启脚本
    const cmd = rebuild ? `${scriptPath} --rebuild` : scriptPath;
    
    // 这里不使用await，因为我们不想等待服务重启完成
    exec(`chmod +x ${scriptPath} && ${cmd}`, (error, stdout, stderr) => {
      if (error) {
        console.error('重启服务失败:', error);
      }
    });
    
    res.status(200).json({ message: '正在重启服务...' });
  } catch (error) {
    res.status(500).json({ message: '重启服务失败', error: error.message });
  }
};

// 执行系统命令（受限的）
exports.executeCommand = async (req, res) => {
  try {
    const { command } = req.body;
    
    // 安全检查 - 只允许执行某些命令
    const allowedCommands = [
      'df', 'free', 'top', 'ps', 'ls', 'cat', 'grep', 'find',
      'systemctl status', 'uptime', 'who', 'w', 'last'
    ];
    
    // 检查命令是否在允许列表中
    const isCommandAllowed = allowedCommands.some(allowed => 
      command.startsWith(allowed)
    );
    
    if (!isCommandAllowed) {
      return res.status(403).json({ message: '命令不被允许' });
    }
    
    // 执行命令
    const { stdout, stderr } = await execPromise(command);
    
    res.status(200).json({
      output: stdout,
      error: stderr
    });
  } catch (error) {
    res.status(500).json({ message: '执行命令失败', error: error.message });
  }
};

// 获取可执行文件列表
exports.getExecutableFiles = async (req, res) => {
  try {
    const { directory } = req.query;
    
    if (!directory) {
      return res.status(400).json({ message: '缺少目录路径' });
    }
    
    // 检查目录是否存在
    if (!await fs.pathExists(directory)) {
      return res.status(404).json({ message: '目录不存在' });
    }
    
    // 获取目录下的所有文件
    const files = await fs.readdir(directory);
    
    // 筛选可执行文件
    const executableFiles = [];
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      try {
        const stats = await fs.stat(filePath);
        
        // 忽略隐藏文件和目录
        if (file.startsWith('.') || stats.isDirectory()) {
          continue;
        }
        
        // 检查是否是可执行文件或脚本文件
        const isExecutable = (stats.mode & fs.constants.S_IXUSR) !== 0;
        const isScript = file.endsWith('.sh') || file.endsWith('.py') || file.endsWith('.js');
        
        if (isExecutable || isScript) {
          executableFiles.push({
            name: file,
            path: filePath,
            isScript
          });
        }
      } catch (error) {
        // 跳过无法访问的文件
        continue;
      }
    }
    
    res.status(200).json(executableFiles);
  } catch (error) {
    res.status(500).json({ message: '获取可执行文件列表失败', error: error.message });
  }
}; 