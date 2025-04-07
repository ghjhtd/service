const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs-extra');
const sudo = require('sudo-prompt');
const os = require('os');

const execPromise = util.promisify(exec);
const sudoOptions = { name: 'ServerManagementSystem' };

// 检测是否在图形环境中
const isGraphicalEnvironment = () => {
  return process.env.DISPLAY || process.env.WAYLAND_DISPLAY;
};

// 使用密码文件执行sudo命令
const execSudoWithPasswordFile = async (command) => {
  try {
    // 创建一个临时脚本文件
    const scriptPath = path.join(os.tmpdir(), `service_mgmt_${Date.now()}.sh`);
    await fs.writeFile(scriptPath, `#!/bin/bash\n${command}`, { mode: 0o755 });
    
    console.log(`执行特权命令: ${command}`);
    
    // 使用sudo执行脚本
    const { stdout, stderr } = await execPromise(`sudo -n ${scriptPath} || sudo ${scriptPath}`);
    
    // 清理临时脚本
    await fs.unlink(scriptPath).catch(() => {});
    
    return { stdout, stderr };
  } catch (error) {
    console.error('执行sudo命令失败:', error);
    throw error;
  }
};

// 执行特权命令的通用函数
const execPrivileged = async (command) => {
  // 如果是在图形环境中，使用sudo-prompt
  if (isGraphicalEnvironment()) {
    return new Promise((resolve, reject) => {
      sudo.exec(command, sudoOptions, (error, stdout, stderr) => {
        if (error) {
          console.error(`特权命令执行失败(sudo-prompt): ${error.message}`);
          // 如果sudo-prompt失败，尝试备用方法
          execSudoWithPasswordFile(command)
            .then(({ stdout, stderr }) => resolve({ stdout, stderr }))
            .catch(err => reject(err));
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  } else {
    // 非图形环境中使用密码文件方法
    return execSudoWithPasswordFile(command);
  }
};

// 获取服务隐藏状态配置文件路径
const getHiddenServicesConfigPath = () => {
  return path.resolve(__dirname, '../../config/hidden_services.json');
};

// 获取服务标签配置文件路径
const getServiceTagsConfigPath = () => {
  return path.resolve(__dirname, '../../config/service_tags.json');
};

// 读取隐藏服务配置
const getHiddenServices = async () => {
  const configPath = getHiddenServicesConfigPath();
  try {
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath);
    } else {
      const defaultConfig = { hiddenServices: [] };
      await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
      return defaultConfig;
    }
  } catch (error) {
    console.error('读取隐藏服务配置失败:', error);
    return { hiddenServices: [] };
  }
};

// 读取服务标签配置
const getServiceTags = async () => {
  const configPath = getServiceTagsConfigPath();
  try {
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath);
    } else {
      const defaultConfig = { serviceTags: {} };
      await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
      return defaultConfig;
    }
  } catch (error) {
    console.error('读取服务标签配置失败:', error);
    return { serviceTags: {} };
  }
};

// 保存隐藏服务配置
const saveHiddenServices = async (hiddenServices) => {
  const configPath = getHiddenServicesConfigPath();
  try {
    await fs.writeJson(configPath, { hiddenServices }, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('保存隐藏服务配置失败:', error);
    return false;
  }
};

// 保存服务标签配置
const saveServiceTags = async (serviceTags) => {
  const configPath = getServiceTagsConfigPath();
  try {
    await fs.writeJson(configPath, { serviceTags }, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('保存服务标签配置失败:', error);
    return false;
  }
};

// 查询所有systemd服务
exports.getAllServices = async (req, res) => {
  try {
    // 获取查询参数
    const showHidden = req.query.showHidden === 'true';
    const tagFilter = req.query.tag; // 标签过滤
    const sortBy = req.query.sortBy || 'name'; // 排序字段
    const sortOrder = req.query.sortOrder || 'asc'; // 排序顺序
    
    // 获取所有服务单元
    const { stdout } = await execPromise('systemctl list-units --type=service --all --no-legend');
    
    // 获取隐藏服务列表
    const { hiddenServices } = await getHiddenServices();
    
    // 获取服务标签
    const { serviceTags } = await getServiceTags();
    
    // 解析输出
    const services = stdout.trim().split('\n').map(line => {
      // 服务输出格式: name loaded active sub description
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) return null;
      
      const serviceName = parts[0];
      const loadState = parts[1];
      const activeState = parts[2];
      const subState = parts[3];
      const description = parts.slice(4).join(' ');
      
      // 只返回.service结尾的服务
      if (!serviceName.endsWith('.service')) return null;
      
      const id = serviceName.replace('.service', '');
      
      // 获取服务标签
      const tags = serviceTags[id] || [];
      
      return {
        id,
        name: serviceName,
        description,
        loadState,
        activeState,
        subState,
        status: activeState === 'active' ? 'running' : 'stopped',
        enabled: null, // 将在下一步检查
        hidden: hiddenServices.includes(id),
        tags
      };
    }).filter(service => service !== null);

    // 检查每个服务是否启用
    for (const service of services) {
      try {
        const { stdout } = await execPromise(`systemctl is-enabled ${service.name}`);
        service.enabled = stdout.trim() === 'enabled';
      } catch (err) {
        service.enabled = false;
      }
    }
    
    // 根据隐藏状态过滤服务
    let filteredServices = showHidden ? services : services.filter(service => !service.hidden);
    
    // 根据标签过滤
    if (tagFilter) {
      filteredServices = filteredServices.filter(service => 
        service.tags && service.tags.includes(tagFilter)
      );
    }
    
    // 排序
    filteredServices.sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];
      
      // 特殊处理某些字段的排序
      if (sortBy === 'status') {
        // 运行状态优先
        valueA = a.status === 'running' ? 0 : 1;
        valueB = b.status === 'running' ? 0 : 1;
      } else if (sortBy === 'enabled') {
        // 启用状态优先
        valueA = a.enabled ? 0 : 1;
        valueB = b.enabled ? 0 : 1;
      }
      
      // 执行排序
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    res.status(200).json(filteredServices);
  } catch (error) {
    console.error('获取服务列表失败:', error);
    res.status(500).json({ message: '获取服务列表失败', error: error.message });
  }
};

// 获取单个服务状态
exports.getServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceName = id.endsWith('.service') ? id : `${id}.service`;
    
    // 获取服务状态
    const { stdout: statusOutput } = await execPromise(`systemctl status ${serviceName}`);
    
    // 检查服务是否启用
    let enabled = false;
    try {
      const { stdout } = await execPromise(`systemctl is-enabled ${serviceName}`);
      enabled = stdout.trim() === 'enabled';
    } catch (err) {
      enabled = false;
    }
    
    // 解析输出获取详细信息
    const loadedLine = statusOutput.match(/Loaded:(.+?)$/m);
    const activeLine = statusOutput.match(/Active:(.+?)$/m);
    const mainPidLine = statusOutput.match(/Main PID: (\d+)/);
    const tasksLine = statusOutput.match(/Tasks: (\d+)/);
    const memoryLine = statusOutput.match(/Memory: (.+?)$/m);
    
    // 提取状态信息
    const loadState = loadedLine ? loadedLine[1].trim() : '未知';
    const activeState = activeLine ? activeLine[1].trim() : '未知';
    const pid = mainPidLine ? mainPidLine[1] : null;
    const tasks = tasksLine ? tasksLine[1] : null;
    const memory = memoryLine ? memoryLine[1].trim() : null;
    
    const serviceInfo = {
      id: id,
      name: serviceName,
      status: activeState.includes('active') ? 'running' : 'stopped',
      enabled: enabled,
      loadState: loadState,
      activeState: activeState,
      pid: pid,
      tasks: tasks,
      memory: memory,
      fullStatus: statusOutput
    };
    
    res.status(200).json(serviceInfo);
  } catch (error) {
    console.error(`获取服务 ${req.params.id} 状态失败:`, error);
    res.status(500).json({ message: `获取服务状态失败`, error: error.message });
  }
};

// 启动服务
exports.startService = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceName = id.endsWith('.service') ? id : `${id}.service`;
    
    // 检查权限
    if (process.getuid && process.getuid() !== 0) {
      // 需要管理员权限
      try {
        const { stdout, stderr } = await execPrivileged(`systemctl start ${serviceName}`);
        return res.status(200).json({ message: `服务 ${id} 已启动`, stdout });
      } catch (error) {
        console.error(`启动服务 ${serviceName} 失败:`, error);
        return res.status(500).json({ 
          message: `启动服务失败`, 
          error: error.message, 
          stderr: error.stderr || ''
        });
      }
    }
    
    // 如果已经有足够权限，直接执行
    await execPromise(`systemctl start ${serviceName}`);
    res.status(200).json({ message: `服务 ${id} 已启动` });
  } catch (error) {
    console.error(`启动服务 ${req.params.id} 失败:`, error);
    res.status(500).json({ message: `启动服务失败`, error: error.message });
  }
};

// 停止服务
exports.stopService = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceName = id.endsWith('.service') ? id : `${id}.service`;
    
    // 检查权限
    if (process.getuid && process.getuid() !== 0) {
      // 需要管理员权限
      try {
        const { stdout, stderr } = await execPrivileged(`systemctl stop ${serviceName}`);
        return res.status(200).json({ message: `服务 ${id} 已停止`, stdout });
      } catch (error) {
        console.error(`停止服务 ${serviceName} 失败:`, error);
        return res.status(500).json({ 
          message: `停止服务失败`, 
          error: error.message, 
          stderr: error.stderr || ''
        });
      }
    }
    
    // 如果已经有足够权限，直接执行
    await execPromise(`systemctl stop ${serviceName}`);
    res.status(200).json({ message: `服务 ${id} 已停止` });
  } catch (error) {
    console.error(`停止服务 ${req.params.id} 失败:`, error);
    res.status(500).json({ message: `停止服务失败`, error: error.message });
  }
};

// 重启服务
exports.restartService = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceName = id.endsWith('.service') ? id : `${id}.service`;
    
    // 检查权限
    if (process.getuid && process.getuid() !== 0) {
      // 需要管理员权限
      try {
        const { stdout, stderr } = await execPrivileged(`systemctl restart ${serviceName}`);
        return res.status(200).json({ message: `服务 ${id} 已重启`, stdout });
      } catch (error) {
        console.error(`重启服务 ${serviceName} 失败:`, error);
        return res.status(500).json({ 
          message: `重启服务失败`, 
          error: error.message, 
          stderr: error.stderr || ''
        });
      }
    }
    
    // 如果已经有足够权限，直接执行
    await execPromise(`systemctl restart ${serviceName}`);
    res.status(200).json({ message: `服务 ${id} 已重启` });
  } catch (error) {
    console.error(`重启服务 ${req.params.id} 失败:`, error);
    res.status(500).json({ message: `重启服务失败`, error: error.message });
  }
};

// 启用服务（开机自启）
exports.enableService = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceName = id.endsWith('.service') ? id : `${id}.service`;
    
    // 检查权限
    if (process.getuid && process.getuid() !== 0) {
      // 需要管理员权限
      try {
        const { stdout, stderr } = await execPrivileged(`systemctl enable ${serviceName}`);
        return res.status(200).json({ message: `服务 ${id} 已启用`, stdout });
      } catch (error) {
        console.error(`启用服务 ${serviceName} 失败:`, error);
        return res.status(500).json({ 
          message: `启用服务失败`, 
          error: error.message, 
          stderr: error.stderr || ''
        });
      }
    }
    
    // 如果已经有足够权限，直接执行
    await execPromise(`systemctl enable ${serviceName}`);
    res.status(200).json({ message: `服务 ${id} 已启用` });
  } catch (error) {
    console.error(`启用服务 ${req.params.id} 失败:`, error);
    res.status(500).json({ message: `启用服务失败`, error: error.message });
  }
};

// 禁用服务（禁止开机自启）
exports.disableService = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceName = id.endsWith('.service') ? id : `${id}.service`;
    
    // 检查权限
    if (process.getuid && process.getuid() !== 0) {
      // 需要管理员权限
      try {
        const { stdout, stderr } = await execPrivileged(`systemctl disable ${serviceName}`);
        return res.status(200).json({ message: `服务 ${id} 已禁用`, stdout });
      } catch (error) {
        console.error(`禁用服务 ${serviceName} 失败:`, error);
        return res.status(500).json({ 
          message: `禁用服务失败`, 
          error: error.message, 
          stderr: error.stderr || ''
        });
      }
    }
    
    // 如果已经有足够权限，直接执行
    await execPromise(`systemctl disable ${serviceName}`);
    res.status(200).json({ message: `服务 ${id} 已禁用` });
  } catch (error) {
    console.error(`禁用服务 ${req.params.id} 失败:`, error);
    res.status(500).json({ message: `禁用服务失败`, error: error.message });
  }
};

// 创建并安装新服务
exports.createService = async (req, res) => {
  try {
    const { name, description, execStart, workingDirectory, environment, restart, user } = req.body;
    
    if (!name || !execStart) {
      return res.status(400).json({ message: '服务名和执行命令是必须的' });
    }
    
    // 创建服务单元文件内容
    let serviceContent = `[Unit]
Description=${description || name}
After=network.target

[Service]
Type=simple
ExecStart=${execStart}
${workingDirectory ? `WorkingDirectory=${workingDirectory}` : ''}
${user ? `User=${user}` : ''}
${restart ? `Restart=${restart}` : 'Restart=on-failure'}
${environment ? `Environment=${environment}` : ''}

[Install]
WantedBy=multi-user.target
`;

    const serviceName = name.endsWith('.service') ? name : `${name}.service`;
    const servicePath = `/etc/systemd/system/${serviceName}`;
    
    // 检查权限
    if (process.getuid && process.getuid() !== 0) {
      // 需要管理员权限
      // 首先写入临时文件
      const tempPath = path.join('/tmp', serviceName);
      await fs.writeFile(tempPath, serviceContent);
      
      try {
        const { stdout, stderr } = await execPrivileged(`cp ${tempPath} ${servicePath} && systemctl daemon-reload`);
        
        // 删除临时文件
        await fs.unlink(tempPath).catch(err => console.error('删除临时文件失败:', err));
        
        return res.status(201).json({ 
          message: `服务 ${name} 已创建`,
          service: {
            id: name,
            name: serviceName,
            description: description || name,
            execStart,
            status: 'stopped',
            enabled: false
          }
        });
      } catch (error) {
        // 删除临时文件
        await fs.unlink(tempPath).catch(err => console.error('删除临时文件失败:', err));
        
        console.error(`创建服务 ${serviceName} 失败:`, error);
        return res.status(500).json({ 
          message: `创建服务失败`, 
          error: error.message, 
          stderr: error.stderr || ''
        });
      }
    }
    
    // 如果已经有足够权限，直接执行
    await fs.writeFile(servicePath, serviceContent);
    await execPromise('systemctl daemon-reload');
    
    res.status(201).json({ 
      message: `服务 ${name} 已创建`,
      service: {
        id: name,
        name: serviceName,
        description: description || name,
        execStart,
        status: 'stopped',
        enabled: false
      }
    });
  } catch (error) {
    console.error('创建服务失败:', error);
    res.status(500).json({ message: '创建服务失败', error: error.message });
  }
};

// 卸载服务
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceName = id.endsWith('.service') ? id : `${id}.service`;
    const servicePath = `/etc/systemd/system/${serviceName}`;
    
    // 检查权限
    if (process.getuid && process.getuid() !== 0) {
      // 需要管理员权限
      try {
        const { stdout, stderr } = await execPrivileged(
          `systemctl stop ${serviceName} && systemctl disable ${serviceName} && rm ${servicePath} && systemctl daemon-reload`
        );
        return res.status(200).json({ message: `服务 ${id} 已删除`, stdout });
      } catch (error) {
        console.error(`删除服务 ${serviceName} 失败:`, error);
        return res.status(500).json({ 
          message: `删除服务失败`, 
          error: error.message, 
          stderr: error.stderr || ''
        });
      }
    }
    
    // 如果已经有足够权限，直接执行
    await execPromise(`systemctl stop ${serviceName}`);
    await execPromise(`systemctl disable ${serviceName}`);
    await fs.unlink(servicePath);
    await execPromise('systemctl daemon-reload');
    
    res.status(200).json({ message: `服务 ${id} 已删除` });
  } catch (error) {
    console.error(`删除服务 ${req.params.id} 失败:`, error);
    res.status(500).json({ message: `删除服务失败`, error: error.message });
  }
};

// 创建项目系统服务(将项目转为systemd服务)
exports.createProjectService = async (req, res) => {
  try {
    const { projectId } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ message: '项目ID是必须的' });
    }
    
    // 读取项目配置
    const projectsConfigPath = path.resolve(__dirname, '../../config/projects.json');
    const projectsConfig = await fs.readJson(projectsConfigPath);
    
    const project = projectsConfig.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ message: '找不到指定的项目' });
    }
    
    // 项目路径
    const projectPath = path.isAbsolute(project.path) 
      ? project.path 
      : path.resolve(__dirname, '../..', project.path);
    
    // 启动脚本
    const startScript = path.join(projectPath, project.scripts.start || 'start.sh');
    const stopScript = path.join(projectPath, project.scripts.stop || 'stop.sh');
    
    // 创建服务单元文件内容
    let serviceContent = `[Unit]
Description=${project.name}
After=network.target

[Service]
Type=simple
WorkingDirectory=${projectPath}
ExecStart=/bin/bash ${startScript}
ExecStop=/bin/bash ${stopScript}
Restart=on-failure

[Install]
WantedBy=multi-user.target
`;

    const serviceName = `${project.id}.service`;
    const servicePath = `/etc/systemd/system/${serviceName}`;
    
    // 检查权限
    if (process.getuid && process.getuid() !== 0) {
      // 需要管理员权限
      // 首先写入临时文件
      const tempPath = path.join('/tmp', serviceName);
      await fs.writeFile(tempPath, serviceContent);
      
      try {
        const { stdout, stderr } = await execPrivileged(`cp ${tempPath} ${servicePath} && systemctl daemon-reload`);
        
        // 删除临时文件
        await fs.unlink(tempPath).catch(err => console.error('删除临时文件失败:', err));
        
        return res.status(201).json({ 
          message: `为项目 ${project.name} 创建的服务已安装`,
          service: {
            id: project.id,
            name: serviceName,
            description: project.description || project.name,
            status: 'stopped',
            enabled: false
          }
        });
      } catch (error) {
        // 删除临时文件
        await fs.unlink(tempPath).catch(err => console.error('删除临时文件失败:', err));
        
        console.error(`为项目 ${project.id} 创建服务失败:`, error);
        return res.status(500).json({ 
          message: `创建服务失败`, 
          error: error.message, 
          stderr: error.stderr || ''
        });
      }
    }
    
    // 如果已经有足够权限，直接执行
    await fs.writeFile(servicePath, serviceContent);
    await execPromise('systemctl daemon-reload');
    
    res.status(201).json({ 
      message: `为项目 ${project.name} 创建的服务已安装`,
      service: {
        id: project.id,
        name: serviceName,
        description: project.description || project.name,
        status: 'stopped',
        enabled: false
      }
    });
  } catch (error) {
    console.error('创建项目服务失败:', error);
    res.status(500).json({ message: '创建项目服务失败', error: error.message });
  }
};

// 创建脚本系统服务(将脚本转为systemd服务)
exports.createScriptService = async (req, res) => {
  try {
    const { scriptId } = req.body;
    
    if (!scriptId) {
      return res.status(400).json({ message: '脚本ID是必须的' });
    }
    
    // 读取脚本配置
    const scriptsConfigPath = path.resolve(__dirname, '../../config/scripts.json');
    const scriptsConfig = await fs.readJson(scriptsConfigPath);
    
    const script = scriptsConfig.scripts.find(s => s.id === scriptId);
    if (!script) {
      return res.status(404).json({ message: '找不到指定的脚本' });
    }
    
    // 脚本路径检查
    if (!path.isAbsolute(script.path)) {
      return res.status(400).json({ message: '脚本路径必须是绝对路径' });
    }
    
    // 脚本文件目录
    const scriptDir = path.dirname(script.path);
    
    // 创建服务单元文件内容
    let serviceContent = `[Unit]
Description=${script.name}
After=network.target

[Service]
Type=simple
WorkingDirectory=${scriptDir}
ExecStart=/bin/bash ${script.path}
Restart=on-failure

[Install]
WantedBy=multi-user.target
`;

    const serviceName = `${script.id}.service`;
    const servicePath = `/etc/systemd/system/${serviceName}`;
    
    // 检查权限
    if (process.getuid && process.getuid() !== 0) {
      // 需要管理员权限
      // 首先写入临时文件
      const tempPath = path.join('/tmp', serviceName);
      await fs.writeFile(tempPath, serviceContent);
      
      return new Promise((resolve, reject) => {
        sudo.exec(`cp ${tempPath} ${servicePath} && systemctl daemon-reload`, sudoOptions, (error, stdout, stderr) => {
          // 删除临时文件
          fs.unlink(tempPath).catch(err => console.error('删除临时文件失败:', err));
          
          if (error) {
            console.error(`为脚本 ${script.id} 创建服务失败:`, error);
            return res.status(500).json({ message: `创建服务失败`, error: error.message, stderr });
          }
          
          res.status(201).json({ 
            message: `为脚本 ${script.name} 创建的服务已安装`,
            service: {
              id: script.id,
              name: serviceName,
              description: script.description || script.name,
              status: 'stopped',
              enabled: false
            }
          });
        });
      });
    }
    
    // 如果已经有足够权限，直接执行
    await fs.writeFile(servicePath, serviceContent);
    await execPromise('systemctl daemon-reload');
    
    res.status(201).json({ 
      message: `为脚本 ${script.name} 创建的服务已安装`,
      service: {
        id: script.id,
        name: serviceName,
        description: script.description || script.name,
        status: 'stopped',
        enabled: false
      }
    });
  } catch (error) {
    console.error('创建脚本服务失败:', error);
    res.status(500).json({ message: '创建脚本服务失败', error: error.message });
  }
};

// 添加隐藏服务的接口
exports.toggleServiceVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const { hidden } = req.body;
    
    if (hidden === undefined) {
      return res.status(400).json({ message: '隐藏状态参数缺失' });
    }
    
    // 读取当前隐藏配置
    const config = await getHiddenServices();
    const hiddenServices = config.hiddenServices;
    
    // 根据操作添加或移除服务
    const serviceIndex = hiddenServices.indexOf(id);
    if (hidden && serviceIndex === -1) {
      hiddenServices.push(id);
    } else if (!hidden && serviceIndex !== -1) {
      hiddenServices.splice(serviceIndex, 1);
    }
    
    // 保存更新后的配置
    await saveHiddenServices(hiddenServices);
    
    res.status(200).json({ 
      message: `服务 ${id} 已${hidden ? '隐藏' : '显示'}`,
      hidden
    });
  } catch (error) {
    console.error(`切换服务 ${req.params.id} 可见性失败:`, error);
    res.status(500).json({ message: '切换服务可见性失败', error: error.message });
  }
};

// 获取服务日志
exports.getServiceLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { lines = 100 } = req.query; // 默认获取100行日志
    const serviceName = id.endsWith('.service') ? id : `${id}.service`;
    
    // 使用journalctl读取系统服务日志
    const { stdout } = await execPromise(`journalctl -u ${serviceName} -n ${lines} --no-pager`);
    
    res.status(200).json({ 
      serviceName,
      logs: stdout,
      timestamp: new Date()
    });
  } catch (error) {
    console.error(`获取服务 ${req.params.id} 日志失败:`, error);
    res.status(500).json({ message: '获取服务日志失败', error: error.message });
  }
};

// 获取服务脚本内容
exports.getServiceScript = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceName = id.endsWith('.service') ? id : `${id}.service`;
    const servicePath = `/etc/systemd/system/${serviceName}`;
    
    // 检查权限
    if (process.getuid && process.getuid() !== 0) {
      // 需要管理员权限，创建临时文件
      try {
        const tempPath = path.join(os.tmpdir(), `service_script_temp_${Date.now()}`);
        const { stdout, stderr } = await execPrivileged(`cat ${servicePath} > ${tempPath}`);
        
        // 读取临时文件内容
        const content = await fs.readFile(tempPath, 'utf8');
        
        // 删除临时文件
        await fs.unlink(tempPath).catch(err => console.error('删除临时文件失败:', err));
        
        return res.status(200).json({ 
          serviceName,
          content,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`获取服务 ${serviceName} 脚本失败:`, error);
        return res.status(500).json({ 
          message: `获取服务脚本失败`, 
          error: error.message, 
          stderr: error.stderr || ''
        });
      }
    }
    
    // 如果已经有足够权限，直接读取
    const content = await fs.readFile(servicePath, 'utf8');
    res.status(200).json({ 
      serviceName,
      content,
      timestamp: new Date()
    });
  } catch (error) {
    console.error(`获取服务 ${req.params.id} 脚本失败:`, error);
    res.status(500).json({ message: '获取服务脚本失败', error: error.message });
  }
};

// 更新服务脚本内容
exports.updateServiceScript = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: '脚本内容不能为空' });
    }
    
    const serviceName = id.endsWith('.service') ? id : `${id}.service`;
    const servicePath = `/etc/systemd/system/${serviceName}`;
    
    // 检查权限
    if (process.getuid && process.getuid() !== 0) {
      // 需要管理员权限
      // 首先写入临时文件
      const tempPath = path.join(os.tmpdir(), `service_script_new_${Date.now()}`);
      await fs.writeFile(tempPath, content);
      
      try {
        const { stdout, stderr } = await execPrivileged(`cp ${tempPath} ${servicePath} && systemctl daemon-reload`);
        
        // 删除临时文件
        await fs.unlink(tempPath).catch(err => console.error('删除临时文件失败:', err));
        
        return res.status(200).json({ 
          message: `服务 ${id} 脚本已更新并重新加载配置`,
          serviceName,
          timestamp: new Date()
        });
      } catch (error) {
        // 删除临时文件
        await fs.unlink(tempPath).catch(err => console.error('删除临时文件失败:', err));
        
        console.error(`更新服务 ${serviceName} 脚本失败:`, error);
        return res.status(500).json({ 
          message: `更新服务脚本失败`, 
          error: error.message, 
          stderr: error.stderr || ''
        });
      }
    }
    
    // 如果已经有足够权限，直接执行
    await fs.writeFile(servicePath, content);
    await execPromise('systemctl daemon-reload');
    
    res.status(200).json({ 
      message: `服务 ${id} 脚本已更新并重新加载配置`,
      serviceName,
      timestamp: new Date()
    });
  } catch (error) {
    console.error(`更新服务 ${req.params.id} 脚本失败:`, error);
    res.status(500).json({ message: '更新服务脚本失败', error: error.message });
  }
};

// 重载服务配置
exports.reloadService = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceName = id.endsWith('.service') ? id : `${id}.service`;
    
    // 检查权限
    if (process.getuid && process.getuid() !== 0) {
      // 需要管理员权限
      try {
        const { stdout, stderr } = await execPrivileged(`systemctl reload ${serviceName}`);
        return res.status(200).json({ message: `服务 ${id} 已重载配置`, stdout });
      } catch (error) {
        console.error(`重载服务 ${serviceName} 失败:`, error);
        return res.status(500).json({ 
          message: `重载服务失败`, 
          error: error.message, 
          stderr: error.stderr || ''
        });
      }
    }
    
    // 如果已经有足够权限，直接执行
    await execPromise(`systemctl reload ${serviceName}`);
    res.status(200).json({ message: `服务 ${id} 已重载配置` });
  } catch (error) {
    console.error(`重载服务 ${req.params.id} 失败:`, error);
    res.status(500).json({ message: `重载服务失败`, error: error.message });
  }
};

// 获取所有可用标签
exports.getAllTags = async (req, res) => {
  try {
    const { serviceTags } = await getServiceTags();
    
    // 提取所有不重复的标签
    const allTags = new Set();
    
    Object.values(serviceTags).forEach(tags => {
      tags.forEach(tag => allTags.add(tag));
    });
    
    res.status(200).json({
      tags: Array.from(allTags).sort()
    });
  } catch (error) {
    console.error('获取标签列表失败:', error);
    res.status(500).json({ message: '获取标签列表失败', error: error.message });
  }
};

// 获取服务标签
exports.getServiceTags = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { serviceTags } = await getServiceTags();
    const tags = serviceTags[id] || [];
    
    res.status(200).json({
      id,
      tags
    });
  } catch (error) {
    console.error(`获取服务 ${req.params.id} 标签失败:`, error);
    res.status(500).json({ message: '获取服务标签失败', error: error.message });
  }
};

// 更新服务标签
exports.updateServiceTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({ message: '标签必须是数组' });
    }
    
    // 获取当前标签配置
    const config = await getServiceTags();
    
    // 更新标签
    config.serviceTags[id] = tags;
    
    // 保存配置
    await saveServiceTags(config.serviceTags);
    
    res.status(200).json({
      id,
      tags,
      message: '服务标签已更新'
    });
  } catch (error) {
    console.error(`更新服务 ${req.params.id} 标签失败:`, error);
    res.status(500).json({ message: '更新服务标签失败', error: error.message });
  }
}; 