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
  Descriptions,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  InfoCircleOutlined,
  ReloadOutlined,
  CodeOutlined,
  SettingOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import DirectorySelector from '../components/DirectorySelector';
import { API_BASE_URL } from '../config/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [form] = Form.useForm();

  // 项目类型选项
  const projectTypes = [
    { value: 'backend', label: '后端服务' },
    { value: 'frontend', label: '前端应用' },
    { value: 'database', label: '数据库' },
    { value: 'tool', label: '工具脚本' }
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('获取项目列表失败:', error);
      message.error('获取项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getProjectStatus = (status, lastStartTime) => {
    if (status === 'running') {
      const duration = lastStartTime 
        ? moment.duration(moment().diff(moment(lastStartTime))).humanize() 
        : '未知';
      return (
        <Space>
          <Badge status="processing" text="运行中" />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            已运行: {duration}
          </Text>
        </Space>
      );
    }
    return <Badge status="default" text="已停止" />;
  };

  const handleCreateProject = () => {
    setCurrentProject(null);
    setIsEditing(false);
    form.resetFields();
    form.setFieldsValue({
      autostart: false,
      type: 'backend'
    });
    setModalVisible(true);
  };

  const handleEditProject = (project) => {
    setCurrentProject(project);
    setIsEditing(true);
    form.setFieldsValue({
      ...project,
      // 确保嵌套属性正确设置
      start: project.scripts?.start,
      stop: project.scripts?.stop,
      build: project.scripts?.build
    });
    setModalVisible(true);
  };

  const handleViewProjectDetails = async (project) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/projects/${project.id}/info`);
      setProjectDetails({
        ...project,
        info: response.data
      });
      setInfoModalVisible(true);
    } catch (error) {
      console.error('获取项目详情失败:', error);
      message.error('获取项目详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProject = async () => {
    try {
      const values = await form.validateFields();
      
      // 构建scripts对象
      const scripts = {
        start: values.start || 'start.sh',
        stop: values.stop || 'stop.sh',
        build: values.build || 'build.sh'
      };
      
      // 从values中移除scripts的单独字段
      delete values.start;
      delete values.stop;
      delete values.build;
      
      // 添加scripts对象
      const projectData = {
        ...values,
        scripts
      };
      
      if (isEditing) {
        await axios.put(`${API_BASE_URL}/projects/${currentProject.id}`, projectData);
        message.success('项目更新成功');
      } else {
        await axios.post(`${API_BASE_URL}/projects`, projectData);
        message.success('项目创建成功');
      }
      
      setModalVisible(false);
      fetchProjects();
    } catch (error) {
      console.error('保存项目失败:', error);
      message.error('保存项目失败');
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await axios.delete(`${API_BASE_URL}/projects/${projectId}`);
      message.success('项目删除成功');
      fetchProjects();
    } catch (error) {
      console.error('删除项目失败:', error);
      message.error('删除项目失败');
    }
  };

  const handleStartProject = async (project) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/projects/${project.id}/start`);
      message.success(`${project.name} 启动成功`);
      fetchProjects();
    } catch (error) {
      console.error('启动项目失败:', error);
      message.error(`启动项目失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopProject = async (project) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/projects/${project.id}/stop`);
      message.success(`${project.name} 停止成功`);
      fetchProjects();
    } catch (error) {
      console.error('停止项目失败:', error);
      message.error(`停止项目失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBuildProject = async (project) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/projects/${project.id}/build`);
      message.success(`${project.name} 构建成功`);
      fetchProjects();
    } catch (error) {
      console.error('构建项目失败:', error);
      message.error(`构建项目失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutostart = async (project) => {
    try {
      const updatedProject = { ...project, autostart: !project.autostart };
      await axios.put(`${API_BASE_URL}/projects/${project.id}`, updatedProject);
      message.success(`${project.name} ${updatedProject.autostart ? '已设置' : '已取消'}开机自启`);
      fetchProjects();
    } catch (error) {
      console.error('更新项目自启动设置失败:', error);
      message.error('更新项目自启动设置失败');
    }
  };

  const columns = [
    {
      title: '项目名称',
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
        
        if (type === 'backend') {
          color = 'green';
          label = '后端服务';
        } else if (type === 'frontend') {
          color = 'orange';
          label = '前端应用';
        } else if (type === 'database') {
          color = 'red';
          label = '数据库';
        } else if (type === 'tool') {
          color = 'purple';
          label = '工具脚本';
        }
        
        return <Tag color={color}>{label}</Tag>;
      }
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => getProjectStatus(record.status, record.lastStartTime)
    },
    {
      title: '启动顺序',
      dataIndex: 'startOrder',
      key: 'startOrder',
      width: 100
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
      render: (_, record) => (
        <Space size="small">
          {record.status === 'running' ? (
            <Tooltip title="停止项目">
              <Button 
                type="text" 
                icon={<PauseCircleOutlined />} 
                onClick={() => handleStopProject(record)}
                loading={loading && currentProject?.id === record.id}
              />
            </Tooltip>
          ) : (
            <Tooltip title="启动项目">
              <Button 
                type="text" 
                icon={<PlayCircleOutlined />} 
                onClick={() => handleStartProject(record)}
                loading={loading && currentProject?.id === record.id}
              />
            </Tooltip>
          )}
          
          <Tooltip title="构建项目">
            <Button 
              type="text" 
              icon={<CodeOutlined />} 
              onClick={() => handleBuildProject(record)}
            />
          </Tooltip>
          
          <Tooltip title="项目详情">
            <Button 
              type="text" 
              icon={<InfoCircleOutlined />} 
              onClick={() => handleViewProjectDetails(record)}
            />
          </Tooltip>
          
          <Tooltip title="编辑项目">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEditProject(record)}
            />
          </Tooltip>
          
          <Tooltip title={record.autostart ? "取消开机自启" : "设置开机自启"}>
            <Button 
              type="text" 
              icon={<SettingOutlined />} 
              onClick={() => handleToggleAutostart(record)}
            />
          </Tooltip>
          
          <Popconfirm
            title="确定要删除此项目吗？"
            onConfirm={() => handleDeleteProject(record.id)}
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
            <Title level={3}>项目管理</Title>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchProjects}
                loading={loading}
              >
                刷新
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleCreateProject}
              >
                添加项目
              </Button>
            </Space>
          </Col>
        </Row>
        <Table 
          columns={columns} 
          dataSource={projects} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 创建/编辑项目弹窗 */}
      <Modal
        title={isEditing ? '编辑项目' : '添加项目'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSaveProject}
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ autostart: false, type: 'backend' }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="id"
                label="项目ID"
                rules={[{ required: true, message: '请输入项目ID' }]}
              >
                <Input placeholder="如: whisperx" disabled={isEditing} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="项目名称"
                rules={[{ required: true, message: '请输入项目名称' }]}
              >
                <Input placeholder="如: WhisperX语音识别" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="path"
            label="项目路径"
            rules={[{ required: true, message: '请选择项目路径' }]}
            tooltip="项目在服务器上的绝对路径"
          >
            <DirectorySelector 
              mode="directory"
              title="选择项目目录"
              placeholder="请选择项目所在目录"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="项目描述"
            rules={[{ required: true, message: '请输入项目描述' }]}
          >
            <TextArea rows={2} placeholder="请输入项目的详细描述" />
          </Form.Item>

          <Form.Item
            name="type"
            label="项目类型"
            rules={[{ required: true, message: '请选择项目类型' }]}
          >
            <Select>
              {projectTypes.map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Alert
            message="脚本配置提示"
            description="以下脚本路径是相对于项目目录的路径，默认为标准脚本名称，如需修改请输入相对于项目目录的路径"
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="start"
                label="启动脚本"
                tooltip="相对于项目目录的路径，如: start.sh"
                initialValue="start.sh"
              >
                <Input placeholder="如: start.sh" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="stop"
                label="停止脚本"
                tooltip="相对于项目目录的路径，如: stop.sh"
                initialValue="stop.sh"
              >
                <Input placeholder="如: stop.sh" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="build"
                label="构建脚本"
                tooltip="相对于项目目录的路径，如: build.sh"
                initialValue="build.sh"
              >
                <Input placeholder="如: build.sh" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="autostart"
            label="开机自启"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 项目详情弹窗 */}
      <Modal
        title={projectDetails?.name ? `${projectDetails.name} 详情` : '项目详情'}
        open={infoModalVisible}
        onCancel={() => setInfoModalVisible(false)}
        footer={null}
        width={700}
      >
        {projectDetails && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="项目ID">{projectDetails.id}</Descriptions.Item>
            <Descriptions.Item label="项目名称">{projectDetails.name}</Descriptions.Item>
            <Descriptions.Item label="项目路径">{projectDetails.path}</Descriptions.Item>
            <Descriptions.Item label="项目描述">{projectDetails.description}</Descriptions.Item>
            <Descriptions.Item label="项目类型">
              {projectTypes.find(t => t.value === projectDetails.type)?.label || projectDetails.type}
            </Descriptions.Item>
            <Descriptions.Item label="启动脚本">{projectDetails.scripts?.start || 'start.sh'}</Descriptions.Item>
            <Descriptions.Item label="停止脚本">{projectDetails.scripts?.stop || 'stop.sh'}</Descriptions.Item>
            <Descriptions.Item label="构建脚本">{projectDetails.scripts?.build || 'build.sh'}</Descriptions.Item>
            <Descriptions.Item label="开机自启">
              {projectDetails.autostart ? '是' : '否'}
            </Descriptions.Item>
            <Descriptions.Item label="运行状态">
              {getProjectStatus(projectDetails.status, projectDetails.lastStartTime)}
            </Descriptions.Item>
            {projectDetails.info && (
              <>
                <Descriptions.Item label="进程ID">{projectDetails.info.pid || '无'}</Descriptions.Item>
                <Descriptions.Item label="内存使用">{projectDetails.info.memory || '无'}</Descriptions.Item>
                <Descriptions.Item label="CPU使用">{projectDetails.info.cpu || '无'}</Descriptions.Item>
                <Descriptions.Item label="端口">{projectDetails.info.port || '无'}</Descriptions.Item>
                <Descriptions.Item label="日志路径">{projectDetails.info.logFile || '无'}</Descriptions.Item>
              </>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Projects; 