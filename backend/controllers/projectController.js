const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const childProcess = require('child_process');

const execPromise = util.promisify(exec);

// 项目配置路径
const projectsConfigPath = path.resolve(__dirname, '../../config/projects.json');
// 项目根路径，用于解析相对路径
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// 解析项目路径（支持绝对路径和相对路径）
const resolveProjectPath = (projectPath) => {
  if (!projectPath) {
    return null;
  }
  
  // 如果是绝对路径，直接返回
  if (path.isAbsolute(projectPath)) {
    return projectPath;
  }
  
  // 相对路径可能的基础目录
  const baseDirs = [
    PROJECT_ROOT,                        // 项目根目录
    path.join(PROJECT_ROOT, 'service'),  // 服务目录
    path.join(PROJECT_ROOT, '..'),       // 上一级目录
    '/home/gonghaojing/jing/server',     // 服务器根目录
    '/home/gonghaojing/jing',            // 用户目录
  ];
  
  // 尝试在各个基础目录中解析路径
  for (const baseDir of baseDirs) {
    // 尝试直接添加路径
    let fullPath = path.join(baseDir, projectPath);
    if (fs.existsSync(fullPath)) {
      console.log(`找到项目目录(直接路径): ${projectPath} => ${fullPath}`);
      return fullPath;
    }
    
    // 尝试移除前导的./和../
    fullPath = path.join(baseDir, projectPath.replace(/^\.\/|^\.\.\/|^\//g, ''));
    if (fs.existsSync(fullPath)) {
      console.log(`找到项目目录(规范化路径): ${projectPath} => ${fullPath}`);
      return fullPath;
    }
    
    // 如果是以../开头的相对路径，尝试特殊处理
    if (projectPath.startsWith('../')) {
      const parts = projectPath.split('/');
      const restPath = parts.slice(1).join('/');
      fullPath = path.join(baseDir, restPath);
      if (fs.existsSync(fullPath)) {
        console.log(`找到项目目录(特殊相对路径): ${projectPath} => ${fullPath}`);
        return fullPath;
      }
    }
  }
  
  // 如果所有尝试都失败，尝试直接搜索目录名
  const dirName = path.basename(projectPath);
  for (const baseDir of baseDirs) {
    try {
      // 递归查找目录
      const findResult = childProcess.execSync(`find ${baseDir} -name "${dirName}" -type d | head -1`, { encoding: 'utf8' }).trim();
      if (findResult) {
        console.log(`通过搜索找到项目目录: ${projectPath} => ${findResult}`);
        return findResult;
      }
    } catch (error) {
      // 忽略错误，继续尝试
    }
  }
  
  // 如果所有尝试都失败，返回相对于项目根目录的路径
  console.warn(`警告: 项目路径无法解析，使用相对于项目根目录的路径: ${projectPath}`);
  return path.join(PROJECT_ROOT, projectPath.replace(/^\.\/|^\.\.\/|^\//g, ''));
};

// 读取项目配置
const getProjectsConfig = async () => {
  try {
    const data = await fs.readJson(projectsConfigPath);
    return data;
  } catch (error) {
    console.error('读取项目配置失败:', error);
    return { projects: [] };
  }
};

// 保存项目配置
const saveProjectsConfig = async (data) => {
  try {
    await fs.writeJson(projectsConfigPath, data, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('保存项目配置失败:', error);
    return false;
  }
};

// 获取所有项目
exports.getAllProjects = async (req, res) => {
  try {
    const data = await getProjectsConfig();
    res.status(200).json(data.projects);
  } catch (error) {
    res.status(500).json({ message: '获取项目列表失败', error: error.message });
  }
};

// 获取单个项目
exports.getProject = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await getProjectsConfig();
    const project = data.projects.find(p => p.id === id);
    
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: '获取项目失败', error: error.message });
  }
};

// 添加新项目
exports.createProject = async (req, res) => {
  try {
    const newProject = req.body;
    
    // 基本验证
    if (!newProject.id || !newProject.name || !newProject.path) {
      return res.status(400).json({ message: '缺少必要的项目信息' });
    }
    
    const data = await getProjectsConfig();
    
    // 检查是否已存在同ID的项目
    if (data.projects.some(p => p.id === newProject.id)) {
      return res.status(400).json({ message: '项目ID已存在' });
    }
    
    // 添加新项目
    data.projects.push({
      ...newProject,
      autostart: newProject.autostart || false,
      startOrder: data.projects.length + 1,
      status: 'stopped',
      lastStartTime: null,
      lastStopTime: null,
      scripts: newProject.scripts || {
        start: 'start.sh',
        stop: 'stop.sh',
        build: 'build.sh'
      }
    });
    
    // 保存配置
    await saveProjectsConfig(data);
    
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ message: '创建项目失败', error: error.message });
  }
};

// 更新项目
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedProject = req.body;
    
    const data = await getProjectsConfig();
    const index = data.projects.findIndex(p => p.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 更新项目，保留原有字段
    data.projects[index] = {
      ...data.projects[index],
      ...updatedProject,
      id // 确保ID不变
    };
    
    // 保存配置
    await saveProjectsConfig(data);
    
    res.status(200).json(data.projects[index]);
  } catch (error) {
    res.status(500).json({ message: '更新项目失败', error: error.message });
  }
};

// 删除项目
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await getProjectsConfig();
    const index = data.projects.findIndex(p => p.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 移除项目
    data.projects.splice(index, 1);
    
    // 保存配置
    await saveProjectsConfig(data);
    
    res.status(200).json({ message: '项目已删除', id });
  } catch (error) {
    res.status(500).json({ message: '删除项目失败', error: error.message });
  }
};

// 启动项目
exports.startProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await getProjectsConfig();
    const index = data.projects.findIndex(p => p.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    const project = data.projects[index];
    
    // 解析项目路径
    const projectFullPath = resolveProjectPath(project.path);
    console.log(`项目 ${project.id} 路径: ${project.path} => ${projectFullPath}`);
    
    // 构建脚本完整路径
    const scriptPath = path.join(projectFullPath, project.scripts.start);
    console.log(`启动脚本路径: ${scriptPath}`);
    
    // 检查脚本是否存在
    if (!await fs.pathExists(scriptPath)) {
      return res.status(400).json({ 
        message: `启动脚本不存在: ${project.scripts.start}`,
        details: {
          projectPath: project.path,
          resolvedPath: projectFullPath,
          scriptPath: scriptPath
        }
      });
    }
    
    // 执行启动脚本
    try {
      // 设置脚本执行权限并运行
      await execPromise(`chmod +x "${scriptPath}"`);
      const { stdout, stderr } = await execPromise(`cd "${projectFullPath}" && ./${project.scripts.start}`);
      
      // 更新项目状态
      data.projects[index].status = 'running';
      data.projects[index].lastStartTime = new Date().toISOString();
      
      // 保存配置
      await saveProjectsConfig(data);
      
      res.status(200).json({ 
        message: '项目已启动', 
        id, 
        status: 'running',
        output: stdout,
        error: stderr
      });
    } catch (execError) {
      return res.status(500).json({ 
        message: '启动项目失败', 
        error: execError.message,
        stderr: execError.stderr,
        stdout: execError.stdout
      });
    }
  } catch (error) {
    res.status(500).json({ message: '启动项目失败', error: error.message });
  }
};

// 停止项目
exports.stopProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await getProjectsConfig();
    const index = data.projects.findIndex(p => p.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    const project = data.projects[index];
    
    // 解析项目路径
    const projectFullPath = resolveProjectPath(project.path);
    console.log(`项目 ${project.id} 路径: ${project.path} => ${projectFullPath}`);
    
    // 构建脚本完整路径
    const scriptPath = path.join(projectFullPath, project.scripts.stop);
    console.log(`停止脚本路径: ${scriptPath}`);
    
    // 检查脚本是否存在
    if (!await fs.pathExists(scriptPath)) {
      return res.status(400).json({ 
        message: `停止脚本不存在: ${project.scripts.stop}`,
        details: {
          projectPath: project.path,
          resolvedPath: projectFullPath,
          scriptPath: scriptPath
        }
      });
    }
    
    // 执行停止脚本
    try {
      // 设置脚本执行权限并运行
      await execPromise(`chmod +x "${scriptPath}"`);
      const { stdout, stderr } = await execPromise(`cd "${projectFullPath}" && ./${project.scripts.stop}`);
      
      // 更新项目状态
      data.projects[index].status = 'stopped';
      data.projects[index].lastStopTime = new Date().toISOString();
      
      // 保存配置
      await saveProjectsConfig(data);
      
      res.status(200).json({ 
        message: '项目已停止', 
        id, 
        status: 'stopped',
        output: stdout,
        error: stderr
      });
    } catch (execError) {
      return res.status(500).json({ 
        message: '停止项目失败', 
        error: execError.message,
        stderr: execError.stderr,
        stdout: execError.stdout
      });
    }
  } catch (error) {
    res.status(500).json({ message: '停止项目失败', error: error.message });
  }
};

// 获取项目详细信息（包括进程、端口等）
exports.getProjectInfo = async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await getProjectsConfig();
    const project = data.projects.find(p => p.id === id);
    
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 如果项目正在运行，获取进程信息
    let processInfo = {
      pid: null,
      cpu: '0%',
      memory: '0MB',
      ports: []
    };
    
    if (project.status === 'running') {
      try {
        // 1. 查找项目进程ID
        const { stdout: pidOutput } = await execPromise(`ps aux | grep "${project.id}" | grep -v "grep" | awk '{print $2}'`);
        const pid = pidOutput.trim().split('\n')[0];
        
        if (pid) {
          processInfo.pid = pid;
          
          // 2. 获取CPU和内存使用情况
          const { stdout: statOutput } = await execPromise(`ps -p ${pid} -o %cpu,%mem,rss | tail -n 1`);
          const stats = statOutput.trim().split(/\s+/);
          
          if (stats.length >= 3) {
            processInfo.cpu = `${stats[0]}%`;
            processInfo.memory = `${Math.round(parseInt(stats[2]) / 1024)}MB`;
          }
          
          // 3. 获取进程使用的端口
          const { stdout: portsOutput } = await execPromise(`lsof -Pan -p ${pid} -i | grep LISTEN | awk '{print $9}' | cut -d':' -f2 | sort -u`);
          if (portsOutput.trim()) {
            processInfo.ports = portsOutput.trim().split('\n').filter(port => port.length > 0);
          }
        }
      } catch (processError) {
        console.error('获取进程信息失败:', processError);
        // 进程信息获取失败不影响整体响应
      }
    }
    
    res.status(200).json(processInfo);
  } catch (error) {
    res.status(500).json({ message: '获取项目详情失败', error: error.message });
  }
};

// 构建项目
exports.buildProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await getProjectsConfig();
    const index = data.projects.findIndex(p => p.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    const project = data.projects[index];
    
    // 解析项目路径
    const projectFullPath = resolveProjectPath(project.path);
    console.log(`项目 ${project.id} 路径: ${project.path} => ${projectFullPath}`);
    
    // 构建脚本完整路径
    const scriptPath = path.join(projectFullPath, project.scripts.build);
    console.log(`构建脚本路径: ${scriptPath}`);
    
    // 检查脚本是否存在
    if (!await fs.pathExists(scriptPath)) {
      return res.status(400).json({ 
        message: `构建脚本不存在: ${project.scripts.build}`,
        details: {
          projectPath: project.path,
          resolvedPath: projectFullPath,
          scriptPath: scriptPath
        }
      });
    }
    
    // 执行构建脚本
    try {
      // 设置脚本执行权限并运行
      await execPromise(`chmod +x "${scriptPath}"`);
      const { stdout, stderr } = await execPromise(`cd "${projectFullPath}" && ./${project.scripts.build}`);
      
      res.status(200).json({ 
        message: '项目构建成功', 
        id,
        output: stdout,
        error: stderr
      });
    } catch (execError) {
      return res.status(500).json({ 
        message: '构建项目失败', 
        error: execError.message,
        stderr: execError.stderr,
        stdout: execError.stdout
      });
    }
  } catch (error) {
    res.status(500).json({ message: '构建项目失败', error: error.message });
  }
};

// 获取项目状态
exports.getProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await getProjectsConfig();
    const project = data.projects.find(p => p.id === id);
    
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    res.status(200).json({ 
      id, 
      status: project.status,
      lastStartTime: project.lastStartTime,
      lastStopTime: project.lastStopTime
    });
  } catch (error) {
    res.status(500).json({ message: '获取项目状态失败', error: error.message });
  }
}; 