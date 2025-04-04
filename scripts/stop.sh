#!/bin/bash

# 停止服务
# 该脚本用于停止整个系统

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../" && pwd)"
PID_FILE="$PROJECT_ROOT/backend.pid"

# 检查PID文件是否存在
if [ ! -f "$PID_FILE" ]; then
    echo "未找到PID文件，服务可能未运行"
    exit 0
fi

# 读取PID
PID=$(cat "$PID_FILE")

# 检查进程是否运行
if ! ps -p "$PID" > /dev/null; then
    echo "服务未运行 (PID: $PID)"
    rm -f "$PID_FILE"
    exit 0
fi

# 停止服务
echo "正在停止服务 (PID: $PID)..."
kill -15 "$PID"

# 等待进程结束
WAIT_COUNT=0
while ps -p "$PID" > /dev/null && [ $WAIT_COUNT -lt 10 ]; do
    echo "等待服务停止..."
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
done

# 如果进程仍然运行，强制终止
if ps -p "$PID" > /dev/null; then
    echo "服务未正常停止，强制终止..."
    kill -9 "$PID"
    sleep 1
fi

# 检查是否成功停止
if ps -p "$PID" > /dev/null; then
    echo "无法停止服务 (PID: $PID)"
    exit 1
else
    echo "服务已停止"
    rm -f "$PID_FILE"
    exit 0
fi 