import React, { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Input,
  message,
  Space,
  Tree,
  Spin,
  Empty,
  Alert
} from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const { DirectoryTree } = Tree;

/**
 * 目录选择组件
 * @param {Object} props 组件属性
 * @param {string} props.value 当前选中的路径
 * @param {Function} props.onChange 值变更回调
 * @param {string} props.placeholder 输入框占位符
 * @param {string} props.mode 选择模式 'file' 或 'directory'
 * @param {string} props.title 模态框标题
 * @param {string} props.label 字段标签
 * @param {boolean} props.disabled 是否禁用
 */
const DirectorySelector = ({
  value,
  onChange,
  placeholder = '请选择...',
  mode = 'file', // 'file' 或 'directory'
  title = '选择文件',
  label = '路径',
  disabled = false
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [directories, setDirectories] = useState([]);
  const [selectedPath, setSelectedPath] = useState('');

  // 加载文件系统
  useEffect(() => {
    if (modalVisible) {
      fetchFileSystem();
    }
  }, [modalVisible]);

  // 获取文件系统结构
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

  // 处理选择
  const handleSelect = (selectedKeys, info) => {
    if (mode === 'file' && info.node.isLeaf) {
      setSelectedPath(info.node.key);
    } else if (mode === 'directory' && !info.node.isLeaf) {
      setSelectedPath(info.node.key);
    }
  };

  // 确认选择
  const handleConfirm = () => {
    if (!selectedPath) {
      message.warning(`请选择一个${mode === 'file' ? '文件' : '目录'}`);
      return;
    }
    
    onChange(selectedPath);
    setModalVisible(false);
  };

  // 显示文件浏览器
  const showFileExplorer = () => {
    setSelectedPath(value || '');
    setModalVisible(true);
  };

  return (
    <>
      <Input
        value={value}
        placeholder={placeholder}
        readOnly
        disabled={disabled}
        addonAfter={
          <Button 
            type="link" 
            size="small" 
            onClick={showFileExplorer}
            disabled={disabled}
            style={{margin: '-7px -12px', height: '30px'}}
          >
            <FolderOpenOutlined /> 浏览
          </Button>
        }
      />

      <Modal
        title={title}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleConfirm}
        width={700}
        destroyOnClose
      >
        {loading ? (
          <Spin tip="正在加载文件系统..." />
        ) : directories.length > 0 ? (
          <>
            <Alert
              message={`请选择一个${mode === 'file' ? '文件' : '目录'}`}
              description={`选择的路径会被保存为绝对路径，以确保系统能正确${mode === 'file' ? '找到并执行该文件' : '访问该目录'}`}
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <DirectoryTree
              defaultExpandAll
              onSelect={handleSelect}
              treeData={directories}
              selectedKeys={selectedPath ? [selectedPath] : []}
            />
          </>
        ) : (
          <Empty description={
            <Space direction="vertical">
              <span>暂无文件系统数据</span>
              <Button type="primary" onClick={fetchFileSystem}>重新加载</Button>
            </Space>
          } />
        )}
      </Modal>
    </>
  );
};

export default DirectorySelector; 