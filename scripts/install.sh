#!/bin/bash

# 服务管理系统安装脚本
echo "开始安装服务器管理系统..."

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# 创建必要的目录
mkdir -p "$SERVICE_DIR/logs"
mkdir -p "$SERVICE_DIR/backups"
mkdir -p "$SERVICE_DIR/data"
mkdir -p "$SERVICE_DIR/temp"

# 设置脚本执行权限
echo "设置脚本执行权限..."
chmod +x "$SCRIPT_DIR"/*.sh
chmod +x "$SCRIPT_DIR/utils"/*.sh

# 安装后端依赖
echo "安装后端依赖..."
cd "$SERVICE_DIR/backend"
npm install

# 安装并构建前端
echo "安装前端依赖并构建..."
cd "$SERVICE_DIR/frontend"
if [ ! -d "node_modules" ]; then
  npm install
fi
# 使用兼容模式构建前端
export NODE_OPTIONS=--openssl-legacy-provider
npm run build

echo "安装完成！"
echo "使用以下命令启动系统:"
echo "  $SCRIPT_DIR/start.sh"
echo ""
echo "使用以下命令停止系统:"
echo "  $SCRIPT_DIR/stop.sh" 