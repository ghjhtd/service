#!/bin/bash

# 备份配置文件
# 用于定时备份系统的配置文件

# 获取当前日期作为备份文件名的一部分
DATE=$(date +%Y%m%d_%H%M%S)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
CONFIG_DIR="$PROJECT_ROOT/config"

# 确保备份目录存在
mkdir -p "$BACKUP_DIR"

# 备份文件名
BACKUP_FILE="$BACKUP_DIR/config_backup_$DATE.tar.gz"

# 创建备份
echo "正在备份配置文件..."
tar -czf "$BACKUP_FILE" -C "$PROJECT_ROOT" config

# 检查备份是否成功
if [ $? -eq 0 ]; then
    echo "备份成功: $BACKUP_FILE"
    
    # 清理旧备份文件，只保留最近10个
    cd "$BACKUP_DIR" && ls -t | grep "config_backup_" | tail -n +11 | xargs rm -f
    echo "已清理旧备份文件，只保留最近10个备份"
else
    echo "备份失败"
    exit 1
fi

exit 0 