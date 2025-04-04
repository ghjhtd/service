const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// 定时任务配置路径
const cronConfigPath = path.resolve(__dirname, '../../config/cron.json');

// 活跃的定时任务
const activeTasks = new Map();

// 读取定时任务配置
const getCronConfig = async () => {
  try {
    const data = await fs.readJson(cronConfigPath);
    return data;
  } catch (error) {
    console.error('读取定时任务配置失败:', error);
    return { tasks: [] };
  }
};

// 保存定时任务配置
const saveCronConfig = async (data) => {
  try {
    await fs.writeJson(cronConfigPath, data, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('保存定时任务配置失败:', error);
    return false;
  }
};

// 计算下次运行时间
const calculateNextRun = (schedule) => {
  try {
    const cronInstance = cron.schedule(schedule, () => {});
    const nextDate = cronInstance.nextDate();
    cronInstance.stop();
    return nextDate.toISOString();
  } catch (error) {
    console.error('计算下次运行时间失败:', error);
    return null;
  }
};

// 启动定时任务
const startCronTask = (task) => {
  if (activeTasks.has(task.id)) {
    // 如果任务已经在运行，先停止它
    stopCronTask(task.id);
  }

  try {
    if (!cron.validate(task.schedule)) {
      console.error(`无效的Cron表达式: ${task.schedule}`);
      return false;
    }

    const cronTask = cron.schedule(task.schedule, async () => {
      console.log(`执行定时任务: ${task.name} (${task.id})`);
      
      try {
        const { stdout, stderr } = await execPromise(task.command);
        console.log(`任务 ${task.id} 执行结果:`, stdout);
        
        if (stderr) {
          console.error(`任务 ${task.id} 错误:`, stderr);
        }
        
        // 更新最后运行时间
        const config = await getCronConfig();
        const taskIndex = config.tasks.findIndex(t => t.id === task.id);
        
        if (taskIndex !== -1) {
          config.tasks[taskIndex].lastRun = new Date().toISOString();
          config.tasks[taskIndex].nextRun = calculateNextRun(task.schedule);
          await saveCronConfig(config);
        }
      } catch (error) {
        console.error(`任务 ${task.id} 执行失败:`, error);
      }
    });
    
    activeTasks.set(task.id, cronTask);
    return true;
  } catch (error) {
    console.error(`启动定时任务 ${task.id} 失败:`, error);
    return false;
  }
};

// 停止定时任务
const stopCronTask = (taskId) => {
  if (activeTasks.has(taskId)) {
    const task = activeTasks.get(taskId);
    task.stop();
    activeTasks.delete(taskId);
    return true;
  }
  return false;
};

// 初始化所有活跃的定时任务
exports.initCronTasks = async () => {
  try {
    const config = await getCronConfig();
    
    // 停止所有现有任务
    for (const taskId of activeTasks.keys()) {
      stopCronTask(taskId);
    }
    
    // 启动所有活跃任务
    let startedCount = 0;
    for (const task of config.tasks) {
      if (task.active) {
        const success = startCronTask(task);
        if (success) {
          startedCount++;
          
          // 更新下一次运行时间
          const taskIndex = config.tasks.findIndex(t => t.id === task.id);
          if (taskIndex !== -1) {
            config.tasks[taskIndex].nextRun = calculateNextRun(task.schedule);
          }
        }
      }
    }
    
    // 保存更新的配置
    await saveCronConfig(config);
    
    console.log(`已初始化 ${startedCount} 个定时任务`);
    return startedCount;
  } catch (error) {
    console.error('初始化定时任务失败:', error);
    return 0;
  }
};

// 获取所有定时任务
exports.getAllTasks = async (req, res) => {
  try {
    const data = await getCronConfig();
    res.status(200).json(data.tasks);
  } catch (error) {
    res.status(500).json({ message: '获取定时任务列表失败', error: error.message });
  }
};

// 获取单个定时任务
exports.getTask = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await getCronConfig();
    const task = data.tasks.find(t => t.id === id);
    
    if (!task) {
      return res.status(404).json({ message: '定时任务不存在' });
    }
    
    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: '获取定时任务失败', error: error.message });
  }
};

// 创建新定时任务
exports.createTask = async (req, res) => {
  try {
    const newTask = req.body;
    
    // 基本验证
    if (!newTask.id || !newTask.name || !newTask.schedule || !newTask.command) {
      return res.status(400).json({ message: '缺少必要的任务信息' });
    }
    
    // 验证Cron表达式
    if (!cron.validate(newTask.schedule)) {
      return res.status(400).json({ message: '无效的Cron表达式' });
    }
    
    const data = await getCronConfig();
    
    // 检查是否已存在同ID的任务
    if (data.tasks.some(t => t.id === newTask.id)) {
      return res.status(400).json({ message: '任务ID已存在' });
    }
    
    // 计算下次运行时间
    const nextRun = calculateNextRun(newTask.schedule);
    
    // 添加新任务
    const task = {
      ...newTask,
      active: newTask.active || false,
      lastRun: null,
      nextRun,
      type: newTask.type || 'system'
    };
    
    data.tasks.push(task);
    
    // 保存配置
    await saveCronConfig(data);
    
    // 如果任务是活跃的，启动它
    if (task.active) {
      startCronTask(task);
    }
    
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: '创建定时任务失败', error: error.message });
  }
};

// 更新定时任务
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTask = req.body;
    
    const data = await getCronConfig();
    const index = data.tasks.findIndex(t => t.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: '定时任务不存在' });
    }
    
    // 如果更新了Cron表达式，验证它
    if (updatedTask.schedule && !cron.validate(updatedTask.schedule)) {
      return res.status(400).json({ message: '无效的Cron表达式' });
    }
    
    const oldTask = data.tasks[index];
    const wasActive = oldTask.active;
    
    // 停止正在运行的任务
    if (wasActive) {
      stopCronTask(id);
    }
    
    // 更新任务，保留原有字段
    const task = {
      ...oldTask,
      ...updatedTask,
      id // 确保ID不变
    };
    
    // 如果Cron表达式改变了，更新下次运行时间
    if (updatedTask.schedule && oldTask.schedule !== updatedTask.schedule) {
      task.nextRun = calculateNextRun(task.schedule);
    }
    
    data.tasks[index] = task;
    
    // 保存配置
    await saveCronConfig(data);
    
    // 如果任务是活跃的，启动它
    if (task.active) {
      startCronTask(task);
    }
    
    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: '更新定时任务失败', error: error.message });
  }
};

// 删除定时任务
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await getCronConfig();
    const index = data.tasks.findIndex(t => t.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: '定时任务不存在' });
    }
    
    // 停止任务
    stopCronTask(id);
    
    // 移除任务
    data.tasks.splice(index, 1);
    
    // 保存配置
    await saveCronConfig(data);
    
    res.status(200).json({ message: '定时任务已删除', id });
  } catch (error) {
    res.status(500).json({ message: '删除定时任务失败', error: error.message });
  }
};

// 启用定时任务
exports.enableTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await getCronConfig();
    const index = data.tasks.findIndex(t => t.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: '定时任务不存在' });
    }
    
    // 已经是活跃状态
    if (data.tasks[index].active) {
      return res.status(200).json({ message: '任务已经是活跃状态', id });
    }
    
    // 启动任务
    const success = startCronTask(data.tasks[index]);
    
    if (!success) {
      return res.status(500).json({ message: '启动定时任务失败', id });
    }
    
    // 更新状态
    data.tasks[index].active = true;
    data.tasks[index].nextRun = calculateNextRun(data.tasks[index].schedule);
    
    // 保存配置
    await saveCronConfig(data);
    
    res.status(200).json({ message: '定时任务已启用', id });
  } catch (error) {
    res.status(500).json({ message: '启用定时任务失败', error: error.message });
  }
};

// 禁用定时任务
exports.disableTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await getCronConfig();
    const index = data.tasks.findIndex(t => t.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: '定时任务不存在' });
    }
    
    // 已经是非活跃状态
    if (!data.tasks[index].active) {
      return res.status(200).json({ message: '任务已经是非活跃状态', id });
    }
    
    // 停止任务
    stopCronTask(id);
    
    // 更新状态
    data.tasks[index].active = false;
    
    // 保存配置
    await saveCronConfig(data);
    
    res.status(200).json({ message: '定时任务已禁用', id });
  } catch (error) {
    res.status(500).json({ message: '禁用定时任务失败', error: error.message });
  }
};

// 手动运行定时任务
exports.runTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await getCronConfig();
    const task = data.tasks.find(t => t.id === id);
    
    if (!task) {
      return res.status(404).json({ message: '定时任务不存在' });
    }
    
    // 执行命令
    try {
      const { stdout, stderr } = await execPromise(task.command);
      
      // 更新最后运行时间
      const index = data.tasks.findIndex(t => t.id === id);
      data.tasks[index].lastRun = new Date().toISOString();
      await saveCronConfig(data);
      
      res.status(200).json({ 
        message: '任务执行成功', 
        id,
        output: stdout,
        error: stderr
      });
    } catch (execError) {
      return res.status(500).json({ 
        message: '任务执行失败', 
        error: execError.message,
        stderr: execError.stderr,
        stdout: execError.stdout
      });
    }
  } catch (error) {
    res.status(500).json({ message: '运行定时任务失败', error: error.message });
  }
}; 