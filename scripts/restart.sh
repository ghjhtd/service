#!/bin/bash

# 重启服务
# 该脚本用于重启整个系统，可选择重建前端

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../" && pwd)"

# 解析参数
REBUILD_FRONTEND=false

for arg in "$@"; do
    case $arg in
        --rebuild)
            REBUILD_FRONTEND=true
            shift
            ;;
    esac
done

# 停止服务
echo "正在停止服务..."
"$SCRIPT_DIR/stop.sh"

# 如果指定了重建前端
if [ "$REBUILD_FRONTEND" = true ]; then
    echo "正在重建前端..."
    cd "$PROJECT_ROOT/frontend"
    
    # 如果安装了依赖，则清理并重新安装
    if [ -d "node_modules" ]; then
        rm -rf build
        npm run build
    else
        npm install && npm run build
    fi
    
    if [ $? -ne 0 ]; then
        echo "前端重建失败"
        exit 1
    fi
fi

# 启动服务
echo "正在启动服务..."
"$SCRIPT_DIR/start.sh"

echo "服务已重启完成"
exit 0 