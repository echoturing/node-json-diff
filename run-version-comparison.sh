#!/bin/bash

# Node.js 版本对比测试自动化脚本
# 使用 fnm 自动切换版本并运行性能测试

set -e  # 遇到错误就退出

echo "🚀 开始 Node.js 版本 JSON 反序列化性能对比测试"
echo "=================================================="

# 检查 fnm 是否可用
if ! command -v fnm &> /dev/null; then
    echo "❌ fnm 未找到，请确保已安装 fnm"
    exit 1
fi

# 要测试的 Node.js 版本
NODE_VERSIONS=("16" "22")

# 清理之前的结果文件
echo "🧹 清理之前的测试结果..."
rm -f benchmark-result-node-*.json

echo ""
echo "📋 可用的 Node.js 版本:"
fnm list

# 为每个版本运行测试
for version in "${NODE_VERSIONS[@]}"; do
    echo ""
    echo "🔄 切换到 Node.js ${version}..."
    
    # 检查版本是否安装
    if ! fnm list | grep -q "v${version}"; then
        echo "⚠️ Node.js ${version} 未安装，正在安装..."
        fnm install ${version}
    fi
    
    # 切换到指定版本
    fnm use ${version}
    
    # 显示当前版本信息
    echo "✅ 当前 Node.js 版本: $(node --version)"
    echo "📊 当前 V8 版本: $(node -p "process.versions.v8")"
    
    # 运行性能测试
    echo "🧪 运行 JSON 反序列化性能测试..."
    echo "----------------------------------------"
    
    # 使用 --expose-gc 启用垃圾回收控制，提高测试准确性
    node --expose-gc node-version-benchmark.js
    
    echo "✅ Node.js ${version} 测试完成"
    echo ""
done

echo "🎉 所有版本测试完成！"
echo ""

# 检查生成的结果文件
echo "📁 生成的结果文件:"
ls -la benchmark-result-node-*.json 2>/dev/null || echo "⚠️ 未找到结果文件"

echo ""
echo "💡 下一步："
echo "1. 查看各个版本的结果文件"
echo "2. 运行 'node compare-results.js' 生成对比报告"
echo ""
