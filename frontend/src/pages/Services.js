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
  Drawer,
  Descriptions,
  Alert,
  Spin,
  Tabs
} from 'antd';
import { 
  PlusOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  DeleteOutlined, 
  EditOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  PoweroffOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  FileTextOutlined,
  CodeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { API_BASE_URL } from '../config/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [statusDrawerVisible, setStatusDrawerVisible] = useState(false);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [form] = Form.useForm();
  const [projectsModalVisible, setProjectsModalVisible] = useState(false);
  const [scriptsModalVisible, setScriptsModalVisible] = useState(false);
  const [projects, setProjects] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [showHiddenServices, setShowHiddenServices] = useState(false);
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  const [serviceLogs, setServiceLogs] = useState({
    logs: '',
    serviceName: '',
    timestamp: null
  });
  const [logsLoading, setLogsLoading] = useState(false);
  const [scriptModalVisible, setScriptModalVisible] = useState(false);
  const [serviceScript, setServiceScript] = useState({
    content: '',
    serviceName: '',
    timestamp: null
  });
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptEdited, setScriptEdited] = useState(false);

  // 初始加载
  useEffect(() => {
    fetchServices();
  }, [showHiddenServices]);

  // 获取所有服务
  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/systemctl?showHidden=${showHiddenServices}`);
      setServices(response.data);
    } catch (error) {
      console.error('获取服务列表失败:', error);
      message.error('获取服务列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取服务详细状态
  const fetchServiceStatus = async (serviceId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/systemctl/${serviceId}`);
      setServiceStatus(response.data);
      setStatusDrawerVisible(true);
    } catch (error) {
      console.error('获取服务状态失败:', error);
      message.error('获取服务状态失败');
    } finally {
      setLoading(false);
    }
  };

  // 启动服务
  const handleStartService = async (service) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/systemctl/${service.id}/start`);
      message.success(`服务 ${service.name} 已启动`);
      fetchServices();
    } catch (error) {
      console.error('启动服务失败:', error);
      message.error(`启动服务失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 停止服务
  const handleStopService = async (service) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/systemctl/${service.id}/stop`);
      message.success(`服务 ${service.name} 已停止`);
      fetchServices();
    } catch (error) {
      console.error('停止服务失败:', error);
      message.error(`停止服务失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 重启服务
  const handleRestartService = async (service) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/systemctl/${service.id}/restart`);
      message.success(`服务 ${service.name} 已重启`);
      fetchServices();
    } catch (error) {
      console.error('重启服务失败:', error);
      message.error(`重启服务失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 重载服务配置
  const handleReloadService = async (service) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/systemctl/${service.id}/reload`);
      message.success(`服务 ${service.name} 配置已重载`);
      fetchServices();
    } catch (error) {
      console.error('重载服务配置失败:', error);
      message.error(`重载服务配置失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 启用/禁用服务
  const handleToggleEnable = async (service) => {
    try {
      setLoading(true);
      if (service.enabled) {
        await axios.post(`${API_BASE_URL}/systemctl/${service.id}/disable`);
        message.success(`服务 ${service.name} 已禁用`);
      } else {
        await axios.post(`${API_BASE_URL}/systemctl/${service.id}/enable`);
        message.success(`服务 ${service.name} 已启用`);
      }
      fetchServices();
    } catch (error) {
      console.error('更改服务启用状态失败:', error);
      message.error(`更改服务启用状态失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 删除服务
  const handleDeleteService = async (service) => {
    try {
      setLoading(true);
      await axios.delete(`${API_BASE_URL}/systemctl/${service.id}`);
      message.success(`服务 ${service.name} 已删除`);
      fetchServices();
    } catch (error) {
      console.error('删除服务失败:', error);
      message.error(`删除服务失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 切换服务显示/隐藏状态
  const handleToggleVisibility = async (service) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/systemctl/${service.id}/visibility`, {
        hidden: !service.hidden
      });
      message.success(`服务 ${service.name} 已${!service.hidden ? '隐藏' : '显示'}`);
      fetchServices();
    } catch (error) {
      console.error('切换服务显示状态失败:', error);
      message.error(`切换服务显示状态失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 查看服务日志
  const handleViewLogs = async (service) => {
    try {
      setLogsLoading(true);
      setLogsModalVisible(true);
      
      const response = await axios.get(`${API_BASE_URL}/systemctl/${service.id}/logs?lines=200`);
      setServiceLogs({
        logs: response.data.logs,
        serviceName: response.data.serviceName,
        timestamp: response.data.timestamp
      });
    } catch (error) {
      console.error('获取服务日志失败:', error);
      message.error(`获取服务日志失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLogsLoading(false);
    }
  };

  // 刷新服务日志
  const handleRefreshLogs = async () => {
    if (!serviceLogs.serviceName) return;
    
    try {
      setLogsLoading(true);
      const serviceId = serviceLogs.serviceName.replace('.service', '');
      const response = await axios.get(`${API_BASE_URL}/systemctl/${serviceId}/logs?lines=200`);
      setServiceLogs({
        logs: response.data.logs,
        serviceName: response.data.serviceName,
        timestamp: response.data.timestamp
      });
      message.success('日志已更新');
    } catch (error) {
      console.error('刷新服务日志失败:', error);
      message.error(`刷新服务日志失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLogsLoading(false);
    }
  };

  // 查看/编辑服务脚本
  const handleViewScript = async (service) => {
    try {
      setScriptLoading(true);
      setScriptModalVisible(true);
      setScriptEdited(false);
      
      const response = await axios.get(`${API_BASE_URL}/systemctl/${service.id}/script`);
      setServiceScript({
        content: response.data.content,
        serviceName: response.data.serviceName,
        timestamp: response.data.timestamp
      });
    } catch (error) {
      console.error('获取服务脚本失败:', error);
      message.error(`获取服务脚本失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setScriptLoading(false);
    }
  };

  // 更新服务脚本内容
  const handleScriptChange = (e) => {
    setServiceScript({
      ...serviceScript,
      content: e.target.value
    });
    setScriptEdited(true);
  };

  // 保存服务脚本
  const handleSaveScript = async () => {
    if (!serviceScript.serviceName) return;
    
    try {
      setScriptLoading(true);
      const serviceId = serviceScript.serviceName.replace('.service', '');
      await axios.post(`${API_BASE_URL}/systemctl/${serviceId}/script`, {
        content: serviceScript.content
      });
      message.success('服务脚本保存成功');
      setScriptEdited(false);
      fetchServices();
    } catch (error) {
      console.error('保存服务脚本失败:', error);
      message.error(`保存服务脚本失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setScriptLoading(false);
    }
  };

  // 显示新建服务模态框
  const handleShowCreateServiceModal = () => {
    setSelectedService(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 创建新服务
  const handleCreateService = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await axios.post(`${API_BASE_URL}/systemctl`, values);
      message.success('服务创建成功');
      setModalVisible(false);
      fetchServices();
    } catch (error) {
      console.error('创建服务失败:', error);
      message.error(`创建服务失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 显示项目列表
  const showProjectsModal = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/projects`);
      setProjects(response.data);
      setProjectsModalVisible(true);
    } catch (error) {
      console.error('获取项目列表失败:', error);
      message.error('获取项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 显示脚本列表
  const showScriptsModal = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/scripts`);
      setScripts(response.data);
      setScriptsModalVisible(true);
    } catch (error) {
      console.error('获取脚本列表失败:', error);
      message.error('获取脚本列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 为项目创建服务
  const handleCreateProjectService = async () => {
    if (!selectedProjectId) {
      message.warning('请先选择一个项目');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/systemctl/project`, { projectId: selectedProjectId });
      message.success('项目服务创建成功');
      setProjectsModalVisible(false);
      setSelectedProjectId(null);
      fetchServices();
    } catch (error) {
      console.error('创建项目服务失败:', error);
      message.error(`创建项目服务失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 为脚本创建服务
  const handleCreateScriptService = async () => {
    if (!selectedScriptId) {
      message.warning('请先选择一个脚本');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/systemctl/script`, { scriptId: selectedScriptId });
      message.success('脚本服务创建成功');
      setScriptsModalVisible(false);
      setSelectedScriptId(null);
      fetchServices();
    } catch (error) {
      console.error('创建脚本服务失败:', error);
      message.error(`创建脚本服务失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取服务状态标签
  const getStatusTag = (service) => {
    const { status, activeState } = service;
    
    if (status === 'running' || activeState === 'active') {
      return <Badge status="success" text="运行中" />;
    } 
    
    if (activeState === 'failed') {
      return <Badge status="error" text="失败" />;
    } 
    
    return <Badge status="default" text="已停止" />;
  };

  // 获取服务启用状态标签
  const getEnabledTag = (enabled) => {
    return (
      <Tag color={enabled ? 'green' : 'default'}>
        {enabled ? '已启用' : '已禁用'}
      </Tag>
    );
  };

  // 获取服务隐藏状态标签
  const getHiddenTag = (hidden) => {
    return hidden ? (
      <Tag color="purple">已隐藏</Tag>
    ) : null;
  };

  // 表格列定义
  const columns = [
    {
      title: '服务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
          {getHiddenTag(record.hidden)}
        </Space>
      )
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => getStatusTag(record)
    },
    {
      title: '开机自启',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled) => getEnabledTag(enabled)
    },
    {
      title: '加载状态',
      dataIndex: 'loadState',
      key: 'loadState',
      render: (text) => <Text ellipsis style={{ maxWidth: 200 }}>{text}</Text>
    },
    {
      title: '操作',
      key: 'action',
      width: 400,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'running' || record.activeState === 'active' ? (
            <Tooltip title="停止服务">
              <Button 
                type="text" 
                icon={<PoweroffOutlined />} 
                onClick={() => handleStopService(record)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="启动服务">
              <Button 
                type="text" 
                icon={<PlayCircleOutlined />} 
                onClick={() => handleStartService(record)}
              />
            </Tooltip>
          )}
          
          <Tooltip title="重启服务">
            <Button 
              type="text" 
              icon={<SyncOutlined />} 
              onClick={() => handleRestartService(record)}
            />
          </Tooltip>

          <Tooltip title="重载配置">
            <Button 
              type="text" 
              icon={<ReloadOutlined />} 
              onClick={() => handleReloadService(record)}
            />
          </Tooltip>
          
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              icon={<InfoCircleOutlined />} 
              onClick={() => fetchServiceStatus(record.id)}
            />
          </Tooltip>
          
          <Tooltip title="查看日志">
            <Button 
              type="text" 
              icon={<FileTextOutlined />} 
              onClick={() => handleViewLogs(record)}
            />
          </Tooltip>

          <Tooltip title="编辑脚本">
            <Button 
              type="text" 
              icon={<CodeOutlined />} 
              onClick={() => handleViewScript(record)}
            />
          </Tooltip>
          
          <Tooltip title={record.enabled ? "禁用自启" : "启用自启"}>
            <Button 
              type="text" 
              icon={<ClockCircleOutlined />} 
              onClick={() => handleToggleEnable(record)}
            />
          </Tooltip>
          
          <Tooltip title={record.hidden ? "显示服务" : "隐藏服务"}>
            <Button 
              type="text" 
              icon={record.hidden ? <EyeOutlined /> : <EyeInvisibleOutlined />} 
              onClick={() => handleToggleVisibility(record)}
            />
          </Tooltip>
          
          <Popconfirm
            title="确定要卸载此服务吗？"
            description="此操作将会删除服务文件，不可恢复"
            onConfirm={() => handleDeleteService(record)}
            okText="是"
            cancelText="否"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 项目表格列
  const projectColumns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'backend' ? 'green' : 'blue'}>
          {type === 'backend' ? '后端' : '前端'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small" 
          onClick={() => setSelectedProjectId(record.id)}
        >
          选择
        </Button>
      )
    }
  ];

  // 脚本表格列
  const scriptColumns = [
    {
      title: '脚本名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small" 
          onClick={() => setSelectedScriptId(record.id)}
        >
          选择
        </Button>
      )
    }
  ];

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={3}>系统服务管理</Title>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchServices}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                type={showHiddenServices ? 'primary' : 'default'}
                icon={<EyeOutlined />}
                onClick={() => setShowHiddenServices(!showHiddenServices)}
              >
                {showHiddenServices ? '隐藏服务中' : '显示所有服务'}
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleShowCreateServiceModal}
              >
                创建服务
              </Button>
              <Button
                type="default"
                onClick={showProjectsModal}
              >
                项目转服务
              </Button>
              <Button
                type="default"
                onClick={showScriptsModal}
              >
                脚本转服务
              </Button>
            </Space>
          </Col>
        </Row>
        
        <Alert
          message="管理员权限提示"
          description="管理systemd服务需要管理员权限。如果遇到操作失败的情况，请确保应用具有足够的权限。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Table 
          columns={columns} 
          dataSource={services} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 创建服务模态框 */}
      <Modal
        title="创建新服务"
        open={modalVisible}
        onOk={handleCreateService}
        onCancel={() => setModalVisible(false)}
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="服务名称"
            rules={[{ required: true, message: '请输入服务名称' }]}
            tooltip="服务名称，勿使用空格和特殊字符"
          >
            <Input placeholder="例如: my-service" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="服务描述"
            rules={[{ required: true, message: '请输入服务描述' }]}
          >
            <Input placeholder="例如: 我的Web服务" />
          </Form.Item>
          
          <Form.Item
            name="execStart"
            label="执行命令"
            rules={[{ required: true, message: '请输入执行命令' }]}
            tooltip="服务启动时执行的命令，需要是绝对路径"
          >
            <Input placeholder="例如: /usr/bin/node /path/to/server.js" />
          </Form.Item>
          
          <Form.Item
            name="workingDirectory"
            label="工作目录"
            tooltip="服务工作目录，需要是绝对路径"
          >
            <Input placeholder="例如: /path/to/directory" />
          </Form.Item>
          
          <Form.Item
            name="user"
            label="运行用户"
            tooltip="服务以哪个用户身份运行"
          >
            <Input placeholder="例如: www-data" />
          </Form.Item>
          
          <Form.Item
            name="environment"
            label="环境变量"
            tooltip="格式: KEY=VALUE"
          >
            <Input placeholder="例如: NODE_ENV=production" />
          </Form.Item>
          
          <Form.Item
            name="restart"
            label="重启策略"
            initialValue="on-failure"
          >
            <Select>
              <Option value="no">不自动重启</Option>
              <Option value="on-success">成功退出时重启</Option>
              <Option value="on-failure">失败时重启</Option>
              <Option value="on-abnormal">异常时重启</Option>
              <Option value="on-abort">中止时重启</Option>
              <Option value="always">总是重启</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 项目列表模态框 */}
      <Modal
        title="选择要转换为服务的项目"
        open={projectsModalVisible}
        onOk={handleCreateProjectService}
        onCancel={() => {
          setProjectsModalVisible(false);
          setSelectedProjectId(null);
        }}
        width={800}
      >
        <Alert
          message="提示"
          description="将项目转换为服务后，您可以使用systemd来管理项目的启动和停止。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Table 
          columns={projectColumns} 
          dataSource={projects} 
          rowKey="id" 
          rowSelection={{
            type: 'radio',
            selectedRowKeys: selectedProjectId ? [selectedProjectId] : [],
            onChange: (selectedRowKeys) => {
              setSelectedProjectId(selectedRowKeys[0]);
            }
          }}
          pagination={{ pageSize: 5 }}
        />
      </Modal>

      {/* 脚本列表模态框 */}
      <Modal
        title="选择要转换为服务的脚本"
        open={scriptsModalVisible}
        onOk={handleCreateScriptService}
        onCancel={() => {
          setScriptsModalVisible(false);
          setSelectedScriptId(null);
        }}
        width={800}
      >
        <Alert
          message="提示"
          description="将脚本转换为服务后，您可以使用systemd来管理脚本的执行。脚本的路径必须是绝对路径。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Table 
          columns={scriptColumns} 
          dataSource={scripts} 
          rowKey="id" 
          rowSelection={{
            type: 'radio',
            selectedRowKeys: selectedScriptId ? [selectedScriptId] : [],
            onChange: (selectedRowKeys) => {
              setSelectedScriptId(selectedRowKeys[0]);
            }
          }}
          pagination={{ pageSize: 5 }}
        />
      </Modal>

      {/* 服务日志模态框 */}
      <Modal
        title={`服务日志 - ${serviceLogs.serviceName}`}
        open={logsModalVisible}
        onCancel={() => setLogsModalVisible(false)}
        width={900}
        footer={[
          <Button key="refresh" onClick={handleRefreshLogs} loading={logsLoading}>
            刷新日志
          </Button>,
          <Button key="close" onClick={() => setLogsModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {logsLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin tip="加载日志中..." />
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 10 }}>
              {serviceLogs.timestamp && (
                <Text type="secondary">
                  最后更新时间: {moment(serviceLogs.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                </Text>
              )}
            </div>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: 16, 
              borderRadius: 4, 
              maxHeight: 500, 
              overflow: 'auto',
              fontSize: 12
            }}>
              {serviceLogs.logs || '暂无日志'}
            </pre>
          </>
        )}
      </Modal>

      {/* 服务脚本编辑模态框 */}
      <Modal
        title={`服务脚本 - ${serviceScript.serviceName}`}
        open={scriptModalVisible}
        onCancel={() => {
          if (scriptEdited) {
            Modal.confirm({
              title: '确认关闭',
              content: '您的修改尚未保存，确定要关闭吗？',
              onOk() {
                setScriptModalVisible(false);
                setScriptEdited(false);
              }
            });
          } else {
            setScriptModalVisible(false);
          }
        }}
        width={900}
        footer={[
          <Button key="save" type="primary" onClick={handleSaveScript} loading={scriptLoading} disabled={!scriptEdited}>
            保存
          </Button>,
          <Button key="close" onClick={() => {
            if (scriptEdited) {
              Modal.confirm({
                title: '确认关闭',
                content: '您的修改尚未保存，确定要关闭吗？',
                onOk() {
                  setScriptModalVisible(false);
                  setScriptEdited(false);
                }
              });
            } else {
              setScriptModalVisible(false);
            }
          }}>
            关闭
          </Button>
        ]}
      >
        {scriptLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin tip="加载脚本中..." />
          </div>
        ) : (
          <>
            <Alert
              message="编辑提示"
              description="您正在编辑systemd服务单元文件，保存后系统将自动重载服务配置。不正确的修改可能导致服务无法启动。"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div style={{ marginBottom: 10 }}>
              {serviceScript.timestamp && (
                <Text type="secondary">
                  最后更新时间: {moment(serviceScript.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                </Text>
              )}
            </div>
            <TextArea
              style={{ 
                fontFamily: 'monospace',
                backgroundColor: '#f5f5f5', 
                height: 500
              }}
              value={serviceScript.content}
              onChange={handleScriptChange}
            />
          </>
        )}
      </Modal>

      {/* 服务详情抽屉 */}
      <Drawer
        title="服务详情"
        placement="right"
        onClose={() => setStatusDrawerVisible(false)}
        open={statusDrawerVisible}
        width={600}
      >
        {serviceStatus ? (
          <>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="服务名称">{serviceStatus.name}</Descriptions.Item>
              <Descriptions.Item label="服务状态">{getStatusTag(serviceStatus)}</Descriptions.Item>
              <Descriptions.Item label="加载状态">{serviceStatus.loadState}</Descriptions.Item>
              <Descriptions.Item label="激活状态">{serviceStatus.activeState}</Descriptions.Item>
              <Descriptions.Item label="主进程ID">{serviceStatus.pid || '无'}</Descriptions.Item>
              <Descriptions.Item label="内存占用">{serviceStatus.memory || '无'}</Descriptions.Item>
              <Descriptions.Item label="任务数">{serviceStatus.tasks || '无'}</Descriptions.Item>
              <Descriptions.Item label="开机自启">{getEnabledTag(serviceStatus.enabled)}</Descriptions.Item>
              <Descriptions.Item label="显示状态">{getHiddenTag(serviceStatus.hidden) || '显示'}</Descriptions.Item>
            </Descriptions>
            
            <Tabs defaultActiveKey="status" style={{ marginTop: 16 }}>
              <TabPane tab="完整状态" key="status">
                <pre style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: 16, 
                  borderRadius: 4, 
                  maxHeight: 300, 
                  overflow: 'auto',
                  fontSize: 12
                }}>
                  {serviceStatus.fullStatus}
                </pre>
              </TabPane>
              <TabPane tab="管理" key="management">
                <div style={{ marginTop: 16 }}>
                  <Space>
                    <Button 
                      type="primary" 
                      onClick={() => {
                        setStatusDrawerVisible(false);
                        handleStartService(serviceStatus);
                      }}
                      disabled={serviceStatus.status === 'running'}
                    >
                      启动
                    </Button>
                    <Button
                      danger
                      onClick={() => {
                        setStatusDrawerVisible(false);
                        handleStopService(serviceStatus);
                      }}
                      disabled={serviceStatus.status !== 'running'}
                    >
                      停止
                    </Button>
                    <Button
                      onClick={() => {
                        setStatusDrawerVisible(false);
                        handleRestartService(serviceStatus);
                      }}
                    >
                      重启
                    </Button>
                    <Button
                      onClick={() => {
                        setStatusDrawerVisible(false);
                        handleReloadService(serviceStatus);
                      }}
                    >
                      重载配置
                    </Button>
                    <Button
                      onClick={() => {
                        setStatusDrawerVisible(false);
                        handleToggleEnable(serviceStatus);
                      }}
                    >
                      {serviceStatus.enabled ? '禁用自启' : '启用自启'}
                    </Button>
                    <Button
                      onClick={() => {
                        setStatusDrawerVisible(false);
                        handleViewLogs(serviceStatus);
                      }}
                    >
                      查看日志
                    </Button>
                    <Button
                      onClick={() => {
                        setStatusDrawerVisible(false);
                        handleViewScript(serviceStatus);
                      }}
                    >
                      编辑脚本
                    </Button>
                  </Space>
                </div>
              </TabPane>
            </Tabs>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin tip="加载中..." />
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Services; 