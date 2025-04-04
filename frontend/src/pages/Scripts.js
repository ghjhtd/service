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
  Popconfirm,
  Card,
  Typography,
  Row,
  Col,
  Tooltip,
  Badge,
  Select,
  InputNumber,
  Upload,
  Tree,
  Radio,
  Tabs,
  Divider,
  Drawer,
  Spin,
  Descriptions,
  Collapse,
  Empty,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  PlayCircleOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  FileTextOutlined,
  UploadOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  StopOutlined,
  SyncOutlined,
  LinkOutlined,
  ScheduleOutlined,
  GlobalOutlined,
  CodeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import DirectorySelector from '../components/DirectorySelector';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { DirectoryTree } = Tree;
const { TabPane } = Tabs;
const { Panel } = Collapse;

// 获取当前域名和端口，用于API请求
const getBaseUrl = () => {
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:9999/api`;
};

const API_BASE_URL = getBaseUrl();

const Scripts = () => {
  // 状态管理
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [contentModalVisible, setContentModalVisible] = useState(false);
  const [fileExplorerVisible, setFileExplorerVisible] = useState(false);
  const [scheduleDrawerVisible, setScheduleDrawerVisible] = useState(false);
  const [statusDrawerVisible, setStatusDrawerVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentScript, setCurrentScript] = useState(null);
  const [scriptContent, setScriptContent] = useState('');
  const [directories, setDirectories] = useState([]);
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [statusInfo, setStatusInfo] = useState(null);
  const [scheduleSetting, setScheduleSetting] = useState({
    enabled: false,
    scheduleType: 'once',
    time: null,
    days: [],
    cronExpression: ''
  });
  const [form] = Form.useForm();
  const [scheduleForm] = Form.useForm();

  // 脚本类型选项
  const scriptTypes = [
    { value: 'shell', label: 'Shell脚本' },
    { value: 'python', label: 'Python脚本' },
    { value: 'node', label: 'Node.js脚本' },
    { value: 'cron', label: 'Cron任务脚本' }
  ];

  // 初始加载
  useEffect(() => {
    fetchScripts();
    fetchFileSystem();
  }, []);

  // 获取脚本列表
  const fetchScripts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/scripts`);
      // 确保设置的数据是数组
      if (Array.isArray(response.data)) {
        setScripts(response.data);
      } else {
        console.error('获取到的脚本数据不是数组:', response.data);
        message.error('脚本数据格式不正确');
        setScripts([]);
      }
    } catch (error) {
      console.error('获取脚本列表失败:', error);
      message.error('获取脚本列表失败');
      setScripts([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取文件系统目录结构
  const fetchFileSystem = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/system/filesystem`);
      if (Array.isArray(response.data)) {
        setDirectories(response.data);
      } else {
        console.error('获取到的文件系统数据格式不正确:', response.data);
        message.error('文件系统数据格式不正确');
        setDirectories([]);
      }
    } catch (error) {
      console.error('获取文件系统结构失败:', error);
      message.error('获取文件系统结构失败');
      setDirectories([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取脚本状态信息
  const fetchScriptStatus = async (scriptId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/scripts/${scriptId}/status`);
      setStatusInfo(response.data);
    } catch (error) {
      console.error('获取脚本状态失败:', error);
      message.error('获取脚本状态失败');
    } finally {
      setLoading(false);
    }
  };

  // 新建脚本
  const handleCreateScript = () => {
    setCurrentScript(null);
    setIsEditing(false);
    form.resetFields();
    form.setFieldsValue({
      autostart: false,
      type: 'shell'
    });
    setModalVisible(true);
  };

  // 编辑脚本
  const handleEditScript = (script) => {
    setCurrentScript(script);
    setIsEditing(true);
    form.setFieldsValue({
      ...script
    });
    setModalVisible(true);
  };

  // 查看/编辑脚本内容
  const handleViewScriptContent = async (script) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/scripts/${script.id}/content`);
      setScriptContent(response.data.content);
      setCurrentScript(script);
      setContentModalVisible(true);
    } catch (error) {
      console.error('获取脚本内容失败:', error);
      message.error('获取脚本内容失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存脚本内容
  const handleSaveScriptContent = async () => {
    try {
      setLoading(true);
      await axios.put(`${API_BASE_URL}/scripts/${currentScript.id}/content`, {
        content: scriptContent
      });
      message.success('脚本内容保存成功');
      setContentModalVisible(false);
    } catch (error) {
      console.error('保存脚本内容失败:', error);
      message.error('保存脚本内容失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存脚本
  const handleSaveScript = async () => {
    try {
      const values = await form.validateFields();
      
      if (isEditing) {
        await axios.put(`${API_BASE_URL}/scripts/${currentScript.id}`, values);
        message.success('脚本更新成功');
      } else {
        await axios.post(`${API_BASE_URL}/scripts`, values);
        message.success('脚本创建成功');
      }
      
      setModalVisible(false);
      fetchScripts();
    } catch (error) {
      console.error('保存脚本失败:', error);
      message.error('保存脚本失败');
    }
  };

  // 删除脚本
  const handleDeleteScript = async (scriptId) => {
    try {
      await axios.delete(`${API_BASE_URL}/scripts/${scriptId}`);
      message.success('脚本删除成功');
      fetchScripts();
    } catch (error) {
      console.error('删除脚本失败:', error);
      message.error('删除脚本失败');
    }
  };

  // 执行脚本
  const handleRunScript = async (script) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/scripts/${script.id}/run`);
      message.success(`${script.name} 执行成功`);
      fetchScripts();
    } catch (error) {
      console.error('执行脚本失败:', error);
      message.error(`执行脚本失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 停止脚本
  const handleStopScript = async (script) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/scripts/${script.id}/stop`);
      message.success(`${script.name} 已停止`);
      fetchScripts();
    } catch (error) {
      console.error('停止脚本失败:', error);
      message.error(`停止脚本失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 切换脚本自启动设置
  const handleToggleAutostart = async (script) => {
    try {
      const updatedScript = { ...script, autostart: !script.autostart };
      await axios.put(`${API_BASE_URL}/scripts/${script.id}`, updatedScript);
      message.success(`${script.name} ${updatedScript.autostart ? '已设置' : '已取消'}开机自启`);
      fetchScripts();
    } catch (error) {
      console.error('更新脚本自启动设置失败:', error);
      message.error('更新脚本自启动设置失败');
    }
  };

  // 打开定时设置抽屉
  const handleOpenScheduleDrawer = (script) => {
    setCurrentScript(script);
    
    // 尝试获取已有的定时设置
    const cronTask = {
      enabled: false,
      scheduleType: 'once',
      cronExpression: '0 0 * * *'
    };
    
    setScheduleSetting(cronTask);
    scheduleForm.setFieldsValue(cronTask);
    setScheduleDrawerVisible(true);
  };

  // 保存定时设置
  const handleSaveSchedule = async () => {
    try {
      const values = await scheduleForm.validateFields();
      
      // 构建cron表达式
      let cronExpression = values.cronExpression;
      if (values.scheduleType !== 'custom') {
        // 构建基于scheduleType的cron表达式
        switch (values.scheduleType) {
          case 'once':
            // 处理一次性执行
            break;
          case 'daily':
            cronExpression = `${values.minute || 0} ${values.hour || 0} * * *`;
            break;
          case 'weekly':
            cronExpression = `${values.minute || 0} ${values.hour || 0} * * ${values.dayOfWeek || 1}`;
            break;
          case 'monthly':
            cronExpression = `${values.minute || 0} ${values.hour || 0} ${values.dayOfMonth || 1} * *`;
            break;
          default:
            break;
        }
      }
      
      // 创建或更新cron任务
      const taskData = {
        id: `script_${currentScript.id}`,
        name: `${currentScript.name} 定时任务`,
        description: `${currentScript.name} 的定时执行任务`,
        command: currentScript.path,
        type: 'script',
        schedule: cronExpression,
        active: values.enabled
      };
      
      await axios.post(`${API_BASE_URL}/cron`, taskData);
      message.success('定时设置保存成功');
      setScheduleDrawerVisible(false);
    } catch (error) {
      console.error('保存定时设置失败:', error);
      message.error('保存定时设置失败');
    }
  };

  // 查看脚本状态
  const handleViewStatus = async (script) => {
    await fetchScriptStatus(script.id);
    setCurrentScript(script);
    setStatusDrawerVisible(true);
  };

  // 获取脚本状态标签
  const getScriptStatus = (lastRunTime, lastRunStatus) => {
    if (!lastRunTime) {
      return <Badge status="default" text="从未运行" />;
    }
    
    return (
      <Space direction="vertical" size={0}>
        <Tag color={lastRunStatus === 'success' ? 'green' : 'red'}>
          {lastRunStatus === 'success' ? '成功' : '失败'}
        </Tag>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {moment(lastRunTime).format('YYYY-MM-DD HH:mm:ss')}
        </Text>
      </Space>
    );
  };

  // 处理文件选择
  const handleSelectFile = (selectedKeys, info) => {
    if (info.node.isLeaf) {
      // 存储完整路径
      const fullPath = info.node.key;
      setSelectedFilePath(fullPath);
    }
  };

  // 确认文件选择
  const handleFileSelect = () => {
    if (selectedFilePath) {
      form.setFieldsValue({
        path: selectedFilePath
      });
      setFileExplorerVisible(false);
    } else {
      message.warning('请选择一个文件');
    }
  };

  // 显示文件浏览器
  const showFileExplorer = () => {
    setFileExplorerVisible(true);
  };

  // 表格列定义
  const columns = [
    {
      title: '脚本名称',
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
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        let color = 'blue';
        let label = type;
        
        if (type === 'shell') {
          color = 'green';
          label = 'Shell脚本';
        } else if (type === 'python') {
          color = 'blue';
          label = 'Python脚本';
        } else if (type === 'node') {
          color = 'orange';
          label = 'Node.js脚本';
        } else if (type === 'cron') {
          color = 'purple';
          label = 'Cron任务脚本';
        }
        
        return <Tag color={color}>{label}</Tag>;
      }
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true
    },
    {
      title: '最后执行',
      key: 'lastRun',
      render: (_, record) => getScriptStatus(record.lastRunTime, record.lastRunStatus)
    },
    {
      title: '开机自启',
      dataIndex: 'autostart',
      key: 'autostart',
      width: 100,
      render: (autostart) => (
        <Tag color={autostart ? 'green' : 'default'}>
          {autostart ? '启用' : '禁用'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="执行脚本">
            <Button 
              type="text" 
              icon={<PlayCircleOutlined />} 
              onClick={() => handleRunScript(record)}
            />
          </Tooltip>
          
          <Tooltip title="停止脚本">
            <Button 
              type="text" 
              icon={<StopOutlined />} 
              onClick={() => handleStopScript(record)}
            />
          </Tooltip>
          
          <Tooltip title="查看/编辑内容">
            <Button 
              type="text" 
              icon={<FileTextOutlined />} 
              onClick={() => handleViewScriptContent(record)}
            />
          </Tooltip>
          
          <Tooltip title="查看状态">
            <Button 
              type="text" 
              icon={<InfoCircleOutlined />} 
              onClick={() => handleViewStatus(record)}
            />
          </Tooltip>
          
          <Tooltip title="设置定时任务">
            <Button 
              type="text" 
              icon={<ScheduleOutlined />} 
              onClick={() => handleOpenScheduleDrawer(record)}
            />
          </Tooltip>
          
          <Tooltip title="编辑脚本">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEditScript(record)}
            />
          </Tooltip>
          
          <Tooltip title={record.autostart ? "取消开机自启" : "设置开机自启"}>
            <Button 
              type="text" 
              icon={<Switch size="small" checked={record.autostart} />} 
              onClick={() => handleToggleAutostart(record)}
            />
          </Tooltip>
          
          <Popconfirm
            title="确定要删除此脚本吗？"
            onConfirm={() => handleDeleteScript(record.id)}
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
            <Title level={3}>脚本管理</Title>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchScripts}
                loading={loading}
              >
                刷新
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleCreateScript}
              >
                添加脚本
              </Button>
            </Space>
          </Col>
        </Row>
        <Table 
          columns={columns} 
          dataSource={scripts} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 创建/编辑脚本弹窗 */}
      <Modal
        title={isEditing ? '编辑脚本' : '添加脚本'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSaveScript}
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ autostart: false, type: 'shell' }}
        >
          <Alert
            message="脚本路径选择提示"
            description="请使用文件选择器选择服务器上的脚本文件路径，这将确保系统能正确找到并执行该脚本"
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="id"
                label="脚本ID"
                rules={[{ required: true, message: '请输入脚本ID' }]}
              >
                <Input placeholder="如: system_backup" disabled={isEditing} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="脚本名称"
                rules={[{ required: true, message: '请输入脚本名称' }]}
              >
                <Input placeholder="如: 系统备份" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="description"
            label="脚本描述"
            rules={[{ required: true, message: '请输入脚本描述' }]}
          >
            <TextArea rows={2} placeholder="请输入脚本的详细描述" />
          </Form.Item>
          
          <Form.Item
            name="path"
            label="脚本路径"
            rules={[{ required: true, message: '请选择脚本路径' }]}
            tooltip="脚本在服务器上的路径，必须通过文件选择器选择"
          >
            <DirectorySelector 
              mode="file"
              title="选择脚本文件"
              placeholder="请选择脚本文件路径"
            />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="脚本类型"
            rules={[{ required: true, message: '请选择脚本类型' }]}
          >
            <Select>
              {scriptTypes.map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="autostart"
            label="系统启动时自动运行"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 文件浏览器弹窗 */}
      <Modal
        title="文件浏览器"
        open={fileExplorerVisible}
        onCancel={() => setFileExplorerVisible(false)}
        onOk={() => {
          if (!selectedFilePath) {
            message.warning('请选择一个文件');
            return;
          }
          form.setFieldsValue({ path: selectedFilePath });
          setFileExplorerVisible(false);
        }}
        width={700}
        destroyOnClose
      >
        {loading ? (
          <Spin tip="正在加载文件系统..." />
        ) : directories.length > 0 ? (
          <>
            <Alert
              message="请选择一个脚本文件"
              description="选择的文件路径会被保存为绝对路径，以确保系统能正确找到并执行该脚本"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <DirectoryTree
              defaultExpandAll
              onSelect={handleSelectFile}
              treeData={directories}
            />
          </>
        ) : (
          <Empty description={
            <span>
              暂无文件系统数据
              <Button type="link" onClick={fetchFileSystem}>重新加载</Button>
            </span>
          } />
        )}
      </Modal>

      {/* 脚本内容弹窗 */}
      <Modal
        title={`${currentScript?.name || '脚本'} 内容`}
        open={contentModalVisible}
        onCancel={() => setContentModalVisible(false)}
        onOk={handleSaveScriptContent}
        width={800}
        destroyOnClose
      >
        <Spin spinning={loading}>
          <Form layout="vertical">
            <Form.Item label="脚本内容">
              <TextArea
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                rows={20}
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>

      {/* 定时设置抽屉 */}
      <Drawer
        title="定时执行设置"
        width={500}
        onClose={() => setScheduleDrawerVisible(false)}
        open={scheduleDrawerVisible}
        extra={
          <Space>
            <Button onClick={() => setScheduleDrawerVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleSaveSchedule}>
              保存
            </Button>
          </Space>
        }
      >
        <Form
          form={scheduleForm}
          layout="vertical"
          initialValues={{ enabled: false, scheduleType: 'once' }}
        >
          <Form.Item
            name="enabled"
            label="启用定时执行"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="scheduleType"
            label="执行周期"
          >
            <Select>
              <Option value="once">执行一次</Option>
              <Option value="daily">每天执行</Option>
              <Option value="weekly">每周执行</Option>
              <Option value="monthly">每月执行</Option>
              <Option value="custom">自定义Cron</Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.scheduleType !== currentValues.scheduleType}>
            {({ getFieldValue }) => {
              const scheduleType = getFieldValue('scheduleType');
              
              if (scheduleType === 'custom') {
                return (
                  <Form.Item
                    name="cronExpression"
                    label="Cron表达式"
                    rules={[{ required: true, message: '请输入Cron表达式' }]}
                    help="格式: 分钟 小时 日 月 星期 (0-59 0-23 1-31 1-12 0-6)"
                  >
                    <Input placeholder="如: 0 2 * * *" />
                  </Form.Item>
                );
              }
              
              return (
                <>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="hour"
                        label="小时"
                        rules={[{ required: true, message: '请输入小时' }]}
                      >
                        <InputNumber min={0} max={23} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="minute"
                        label="分钟"
                        rules={[{ required: true, message: '请输入分钟' }]}
                      >
                        <InputNumber min={0} max={59} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  {scheduleType === 'weekly' && (
                    <Form.Item
                      name="dayOfWeek"
                      label="星期"
                      rules={[{ required: true, message: '请选择星期' }]}
                    >
                      <Select>
                        <Option value="1">星期一</Option>
                        <Option value="2">星期二</Option>
                        <Option value="3">星期三</Option>
                        <Option value="4">星期四</Option>
                        <Option value="5">星期五</Option>
                        <Option value="6">星期六</Option>
                        <Option value="0">星期日</Option>
                      </Select>
                    </Form.Item>
                  )}
                  
                  {scheduleType === 'monthly' && (
                    <Form.Item
                      name="dayOfMonth"
                      label="日期"
                      rules={[{ required: true, message: '请输入日期' }]}
                    >
                      <InputNumber min={1} max={31} style={{ width: '100%' }} />
                    </Form.Item>
                  )}
                </>
              );
            }}
          </Form.Item>
        </Form>
      </Drawer>

      {/* 状态查看抽屉 */}
      <Drawer
        title="脚本状态详情"
        width={500}
        onClose={() => setStatusDrawerVisible(false)}
        open={statusDrawerVisible}
      >
        {statusInfo ? (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="脚本名称">{currentScript?.name}</Descriptions.Item>
            <Descriptions.Item label="脚本路径">{currentScript?.path}</Descriptions.Item>
            <Descriptions.Item label="运行状态">
              {statusInfo.running ? (
                <Badge status="processing" text="运行中" />
              ) : (
                <Badge status="default" text="未运行" />
              )}
            </Descriptions.Item>
            <Descriptions.Item label="进程ID">{statusInfo.pid || '无'}</Descriptions.Item>
            <Descriptions.Item label="内存使用">{statusInfo.memory || '无'}</Descriptions.Item>
            <Descriptions.Item label="CPU使用">{statusInfo.cpu || '无'}</Descriptions.Item>
            <Descriptions.Item label="运行时间">{statusInfo.uptime || '无'}</Descriptions.Item>
            <Descriptions.Item label="启动时间">
              {statusInfo.startTime ? moment(statusInfo.startTime).format('YYYY-MM-DD HH:mm:ss') : '无'}
            </Descriptions.Item>
            <Descriptions.Item label="使用端口">
              {statusInfo.ports && statusInfo.ports.length > 0 ? (
                <div>
                  {statusInfo.ports.map(port => (
                    <Tag key={port} color="blue">{port}</Tag>
                  ))}
                </div>
              ) : '无'}
            </Descriptions.Item>
            <Descriptions.Item label="访问地址">
              {statusInfo.ports && statusInfo.ports.length > 0 ? (
                <Space direction="vertical">
                  {statusInfo.ports.map(port => (
                    <Button 
                      key={port} 
                      type="link" 
                      icon={<GlobalOutlined />}
                      onClick={() => window.open(`http://localhost:${port}`, '_blank')}
                    >
                      http://localhost:{port}
                    </Button>
                  ))}
                </Space>
              ) : '无可访问地址'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Spin tip="正在加载状态信息..." />
        )}
      </Drawer>
    </div>
  );
};

export default Scripts; 