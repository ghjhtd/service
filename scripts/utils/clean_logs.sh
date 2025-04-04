#!/bin/bash

# 清理日志文件
# 用于定期清理系统的日志文件，防止日志过大占用磁盘空间

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs"

# 确保日志目录存在
if [ ! -d "$LOGS_DIR" ]; then
    echo "日志目录不存在: $LOGS_DIR"
    exit 1
fi

echo "开始清理日志文件..."

# 清理7天前的日志文件
find "$LOGS_DIR" -type f -name "*.log" -mtime +7 -delete
# 清理过大的日志文件（超过10MB）
find "$LOGS_DIR" -type f -name "*.log" -size +10M -exec truncate -s 0 {} \;

# 压缩超过1MB但小于10MB的日志文件
find "$LOGS_DIR" -type f -name "*.log" -size +1M -size -10M -exec gzip -f {} \;

echo "日志清理完成"
exit 0 