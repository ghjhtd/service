import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Space,
  Tag,
  Select,
  Popconfirm,
  Card,
  Typography,
  Row,
  Col,
  TimePicker,
  InputNumber
} from 'antd';
import { PlusOutlined, PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { API_BASE_URL } from '../config/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const CronTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [form] = Form.useForm();
  const [advancedMode, setAdvancedMode] = useState(false);

  // 定时任务类型选项
  const taskTypes = [
    { value: 'system', label: '系统任务' },
    { value: 'project', label: '项目任务' },
    { value: 'custom', label: '自定义任务' }
  ];

  // 周期选项
  const scheduleTypes = [
    { value: 'once', label: '执行一次' },
    { value: 'daily', label: '每天执行' },
    { value: 'weekly', label: '每周执行' },
    { value: 'monthly', label: '每月执行' },
    { value: 'custom', label: '自定义Cron' }
  ];

  // 星期选项
  const weekdayOptions = [
    { value: '1', label: '星期一' },
    { value: '2', label: '星期二' },
    { value: '3', label: '星期三' },
    { value: '4', label: '星期四' },
    { value: '5', label: '星期五' },
    { value: '6', label: '星期六' },
    { value: '0', label: '星期日' },
  ];

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/cron`);
      setTasks(response.data);
    } catch (error) {
      console.error('获取定时任务失败:', error);
      message.error('获取定时任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = () => {
    setCurrentTask(null);
    setIsEditing(false);
    setAdvancedMode(false);
    form.resetFields();
    form.setFieldsValue({
      active: true,
      type: 'custom',
      scheduleType: 'daily'
    });
    setModalVisible(true);
  };

  const handleEditTask = (task) => {
    setCurrentTask(task);
    setIsEditing(true);
    setModalVisible(true);
    
    // 检测是否是高级模式的cron表达式
    const isAdvanced = task.schedule.split(' ').length === 5;
    setAdvancedMode(isAdvanced);
    
    form.setFieldsValue({
      id: task.id,
      name: task.name,
      description: task.description,
      command: task.command,
      active: task.active,
      type: task.type || 'custom',
      schedule: task.schedule,
      scheduleType: getScheduleType(task.schedule)
    });
    
    // 如果是基本模式，解析并设置时间值
    if (!isAdvanced) {
      const timeValues = parseBasicSchedule(task.schedule);
      if (timeValues) {
        form.setFieldsValue(timeValues);
      }
    }
  };

  const getScheduleType = (schedule) => {
    const parts = schedule.split(' ');
    if (parts.length !== 5) return 'custom';
    
    // 简单判断常见的cron模式
    if (parts[0] === '*' && parts[1] === '*' && parts[2] === '*' && parts[3] === '*') return 'daily';
    if (parts[2] === '*' && parts[3] === '*') return 'daily';
    if (parts[2] === '*' && parts[4] !== '*') return 'weekly';
    if (parts[3] === '*') return 'monthly';
    
    return 'custom';
  };
  
  const parseBasicSchedule = (schedule) => {
    const parts = schedule.split(' ');
    if (parts.length !== 5) return null;
    
    try {
      // 分钟 小时 日期 月份 星期
      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
      
      return {
        minute: minute === '*' ? undefined : parseInt(minute),
        hour: hour === '*' ? undefined : parseInt(hour),
        dayOfMonth: dayOfMonth === '*' ? undefined : parseInt(dayOfMonth),
        month: month === '*' ? undefined : parseInt(month),
        dayOfWeek: dayOfWeek === '*' ? undefined : dayOfWeek
      };
    } catch (error) {
      return null;
    }
  };

  const buildCronExpression = (values) => {
    const { scheduleType, minute, hour, dayOfMonth, month, dayOfWeek } = values;
    
    if (scheduleType === 'custom') {
      return values.schedule;
    }
    
    // 默认值
    let minuteVal = minute !== undefined ? minute : 0;
    let hourVal = hour !== undefined ? hour : 0;
    let domVal = '*';
    let monthVal = '*';
    let dowVal = '*';
    
    switch (scheduleType) {
      case 'once':
        const now = new Date();
        domVal = values.dayOfMonth || now.getDate();
        monthVal = values.month || (now.getMonth() + 1);
        break;
      case 'daily':
        // 每天在特定时间执行
        break;
      case 'weekly':
        // 每周特定日期执行
        dowVal = values.dayOfWeek || '1';
        break;
      case 'monthly':
        // 每月特定日期执行
        domVal = values.dayOfMonth || 1;
        break;
      default:
        break;
    }
    
    return `${minuteVal} ${hourVal} ${domVal} ${monthVal} ${dowVal}`;
  };

  const handleSaveTask = async () => {
    try {
      const values = await form.validateFields();
      
      // 构建Cron表达式
      if (!advancedMode) {
        values.schedule = buildCronExpression(values);
      }
      
      if (isEditing) {
        await axios.put(`${API_BASE_URL}/cron/${currentTask.id}`, values);
        message.success('定时任务更新成功');
      } else {
        await axios.post(`${API_BASE_URL}/cron`, values);
        message.success('定时任务创建成功');
      }
      
      setModalVisible(false);
      fetchTasks();
    } catch (error) {
      console.error('保存定时任务失败:', error);
      message.error('保存定时任务失败');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`${API_BASE_URL}/cron/${taskId}`);
      message.success('定时任务删除成功');
      fetchTasks();
    } catch (error) {
      console.error('删除定时任务失败:', error);
      message.error('删除定时任务失败');
    }
  };

  const handleToggleActive = async (task) => {
    try {
      const updatedTask = { ...task, active: !task.active };
      await axios.put(`${API_BASE_URL}/cron/${task.id}`, updatedTask);
      message.success(`定时任务${updatedTask.active ? '启动' : '停止'}成功`);
      fetchTasks();
    } catch (error) {
      console.error('切换定时任务状态失败:', error);
      message.error('切换定时任务状态失败');
    }
  };

  const getStatusTag = (task) => {
    if (task.active) {
      return <Tag color="green">运行中</Tag>;
    }
    return <Tag color="default">已停止</Tag>;
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
        </Space>
      )
    },
    {
      title: '执行计划',
      dataIndex: 'schedule',
      key: 'schedule',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text code>{text}</Text>
          {record.nextRun && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              下次执行: {moment(record.nextRun).format('YYYY-MM-DD HH:mm:ss')}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        let color = 'blue';
        let label = '自定义';
        
        if (type === 'system') {
          color = 'purple';
          label = '系统';
        } else if (type === 'project') {
          color = 'orange';
          label = '项目';
        }
        
        return <Tag color={color}>{label}</Tag>;
      }
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => getStatusTag(record)
    },
    {
      title: '上次执行',
      dataIndex: 'lastRun',
      key: 'lastRun',
      render: (text) => text ? moment(text).format('YYYY-MM-DD HH:mm:ss') : '从未执行'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={record.active ? <PauseCircleOutlined /> : <PlayCircleOutlined />} 
            onClick={() => handleToggleActive(record)}
          />
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditTask(record)}
          />
          <Popconfirm
            title="确定要删除此定时任务吗？"
            onConfirm={() => handleDeleteTask(record.id)}
            okText="是"
            cancelText="否"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={3}>定时任务管理</Title>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleCreateTask}
            >
              添加定时任务
            </Button>
          </Col>
        </Row>
        <Table 
          columns={columns} 
          dataSource={tasks} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={isEditing ? '编辑定时任务' : '添加定时任务'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSaveTask}
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ active: true, type: 'custom', scheduleType: 'daily' }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="id"
                label="任务ID"
                rules={[{ required: true, message: '请输入任务ID' }]}
              >
                <Input placeholder="如: backup_task" disabled={isEditing} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="任务名称"
                rules={[{ required: true, message: '请输入任务名称' }]}
              >
                <Input placeholder="如: 数据库备份" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="任务描述"
          >
            <TextArea rows={2} placeholder="请输入任务的详细描述" />
          </Form.Item>

          <Form.Item
            name="command"
            label="执行命令/脚本"
            rules={[{ required: true, message: '请输入执行命令或脚本路径' }]}
          >
            <TextArea rows={3} placeholder="如: /path/to/script.sh 或 ls -la" />
          </Form.Item>

          <Form.Item
            name="type"
            label="任务类型"
          >
            <Select>
              {taskTypes.map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="scheduleType"
            label="执行周期"
          >
            <Select onChange={(value) => {
              setAdvancedMode(value === 'custom');
              // 如果是自定义模式，清空已设置的基本模式值
              if (value === 'custom') {
                form.resetFields(['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']);
              }
            }}>
              {scheduleTypes.map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>

          {advancedMode ? (
            <Form.Item
              name="schedule"
              label="Cron表达式"
              rules={[{ required: true, message: '请输入有效的Cron表达式' }]}
              extra="格式: 分钟 小时 日期 月份 星期 (0-59 0-23 1-31 1-12 0-6)"
            >
              <Input placeholder="如: 0 2 * * *" />
            </Form.Item>
          ) : (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="hour"
                    label="小时"
                    rules={[{ required: true, message: '请设置小时' }]}
                  >
                    <InputNumber min={0} max={23} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="minute"
                    label="分钟"
                    rules={[{ required: true, message: '请设置分钟' }]}
                  >
                    <InputNumber min={0} max={59} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => 
                  prevValues.scheduleType !== currentValues.scheduleType
                }
              >
                {({ getFieldValue }) => {
                  const scheduleType = getFieldValue('scheduleType');
                  
                  if (scheduleType === 'weekly') {
                    return (
                      <Form.Item
                        name="dayOfWeek"
                        label="星期"
                        rules={[{ required: true, message: '请选择星期' }]}
                      >
                        <Select>
                          {weekdayOptions.map(day => (
                            <Option key={day.value} value={day.value}>{day.label}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    );
                  }
                  
                  if (scheduleType === 'monthly' || scheduleType === 'once') {
                    return (
                      <Form.Item
                        name="dayOfMonth"
                        label="日期"
                        rules={[{ required: true, message: '请设置日期' }]}
                      >
                        <InputNumber min={1} max={31} style={{ width: '100%' }} />
                      </Form.Item>
                    );
                  }
                  
                  return null;
                }}
              </Form.Item>
            </>
          )}

          <Form.Item
            name="active"
            label="启用任务"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CronTasks; 