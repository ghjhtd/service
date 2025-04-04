import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import { Layout, Menu, Typography, Spin } from 'antd';
import 'antd/dist/antd.css';
import './App.css';
import Projects from './pages/Projects';
import CronTasks from './pages/CronTasks';
import Scripts from './pages/Scripts';

const { Header, Content, Footer, Sider } = Layout;
const { Title } = Typography;

function App() {
  const [loading, setLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    // 模拟加载系统信息
    setTimeout(() => {
      setSystemInfo({
        name: '服务器管理系统',
        version: '1.0.0'
      });
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider collapsible>
          <div className="logo">
            <Title level={4} style={{ color: 'white', margin: '16px' }}>
              {systemInfo.name}
            </Title>
          </div>
          <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
            <Menu.Item key="1">
              <Link to="/">仪表盘</Link>
            </Menu.Item>
            <Menu.Item key="2">
              <Link to="/projects">项目管理</Link>
            </Menu.Item>
            <Menu.Item key="3">
              <Link to="/scripts">脚本管理</Link>
            </Menu.Item>
            <Menu.Item key="4">
              <Link to="/cron">定时任务</Link>
            </Menu.Item>
            <Menu.Item key="5">
              <Link to="/system">系统设置</Link>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout className="site-layout">
          <Header className="site-layout-background" style={{ padding: 0 }} />
          <Content style={{ margin: '16px' }}>
            <div className="site-layout-background" style={{ padding: 24, minHeight: 360 }}>
              <Switch>
                <Route path="/" exact>
                  <div>
                    <Title level={2}>欢迎使用服务器管理系统</Title>
                    <p>该系统可以帮助您管理服务器上的项目和定时任务。</p>
                    <p>请使用左侧菜单浏览不同功能。</p>
                  </div>
                </Route>
                <Route path="/projects">
                  <Projects />
                </Route>
                <Route path="/scripts">
                  <Scripts />
                </Route>
                <Route path="/cron">
                  <CronTasks />
                </Route>
                <Route path="/system">
                  <Title level={2}>系统设置</Title>
                  <p>这里可以配置系统参数。</p>
                </Route>
              </Switch>
            </div>
          </Content>
          <Footer style={{ textAlign: 'center' }}>
            {systemInfo.name} v{systemInfo.version} ©{new Date().getFullYear()}
          </Footer>
        </Layout>
      </Layout>
    </Router>
  );
}

export default App; 