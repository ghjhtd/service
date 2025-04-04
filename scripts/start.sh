#!/bin/bash

# 启动服务
# 该脚本用于启动整个系统，包括后端服务和前端（如果需要）

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
PID_FILE="$PROJECT_ROOT/backend.pid"

# 检查后端是否已经运行
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null; then
        echo "后端服务已在运行中，进程ID: $PID"
        echo "如需重启，请先运行 stop.sh 停止服务"
        exit 1
    else
        echo "检测到陈旧的PID文件，继续启动..."
        rm -f "$PID_FILE"
    fi
fi

# 检查前端构建目录是否存在，不存在则构建
if [ ! -d "$FRONTEND_DIR/build" ] || [ ! -f "$FRONTEND_DIR/build/index.html" ]; then
    echo "前端构建不存在，正在构建..."
    cd "$FRONTEND_DIR" && npm install && npm run build
    
    if [ $? -ne 0 ]; then
        echo "前端构建失败，退出启动"
        exit 1
    fi
fi

# 启动后端服务
echo "正在启动后端服务..."
cd "$BACKEND_DIR"

# 检查node_modules是否存在
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo "正在安装后端依赖..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "后端依赖安装失败，退出启动"
        exit 1
    fi
fi

# 启动服务并写入日志
nohup node server.js > "$PROJECT_ROOT/logs/server.log" 2>&1 &

# 保存PID
echo $! > "$PID_FILE"
echo "后端服务已启动，进程ID: $(cat "$PID_FILE")"
echo "日志文件: $PROJECT_ROOT/logs/server.log"

exit 0 