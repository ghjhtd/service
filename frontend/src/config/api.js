// API配置文件

// 获取当前域名和端口，用于API请求
export const getBaseUrl = () => {
  // 优先使用window.location中的主机名，这样在开发和生产环境都能正常工作
  const { protocol, hostname } = window.location;
  
  // 特别处理localhost环境，始终使用9999端口
  return `${protocol}//${hostname}:9999/api`;
};

// 导出API基础URL
export const API_BASE_URL = getBaseUrl();

// API请求超时时间（毫秒）
export const API_TIMEOUT = 30000;

// API请求头
export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// API错误消息
export const API_ERROR_MESSAGES = {
  DEFAULT: '请求失败，请稍后再试',
  TIMEOUT: '请求超时，请检查网络连接',
  NETWORK: '网络错误，请检查连接',
  SERVER: '服务器错误',
  UNAUTHORIZED: '未授权访问，请登录'
}; 