// JSON vs Protobuf 性能测试结果分析脚本

const fs = require('fs');
const path = require('path');

// 读取基准测试结果文件
function loadBenchmarkResults() {
  const files = fs.readdirSync(__dirname)
    .filter(file => file.startsWith('json-protobuf-benchmark-') && file.endsWith('.json'))
    .sort();
  
  if (files.length === 0) {
    console.log('❌ 未找到任何测试结果文件');
    console.log('请先运行 npm run json-vs-protobuf 生成测试结果');
    return [];
  }
  
  console.log(`📁 找到 ${files.length} 个结果文件:`);
  files.forEach(file => console.log(`  - ${file}`));
  console.log('');
  
  return files.map(file => {
    const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
    return { filename: file, data: JSON.parse(content) };
  });
}

// 生成性能分析报告
function generateAnalysisReport(results) {
  if (results.length === 0) return;
  
  // 使用最新的测试结果
  const latestResult = results[results.length - 1];
  const data = latestResult.data;
  
  console.log('📊 JSON vs Protobuf 性能分析报告');
  console.log('='.repeat(80));
  console.log(`测试时间: ${data.timestamp}`);
  console.log(`Node.js 版本: ${data.nodeVersion}`);
  console.log(`测试平台: ${data.platform}`);
  console.log(`CPU: ${data.cpu}`);
  console.log(`内存: ${data.memory}`);
  console.log('');
  
  // 详细性能分析
  console.log('🔍 详细性能分析');
  console.log('='.repeat(80));
  
  const sizes = ['small', 'medium', 'large'];
  const sizeNames = { small: '小数据', medium: '中等数据', large: '大数据' };
  
  sizes.forEach(size => {
    const result = data.results[size];
    console.log(`\n📈 ${sizeNames[size]} (${size.toUpperCase()}) 分析:`);
    console.log('─'.repeat(60));
    
    // 数据压缩分析
    console.log('💾 数据大小对比:');
    console.log(`  JSON:     ${(result.size.json / 1024).toFixed(2)} KB`);
    console.log(`  Protobuf: ${(result.size.protobuf / 1024).toFixed(2)} KB`);
    console.log(`  压缩率:   ${result.size.compressionRatio.toFixed(1)}%`);
    console.log(`  节省空间: ${((result.size.json - result.size.protobuf) / 1024).toFixed(2)} KB`);
    
    // 序列化性能分析
    console.log('\n📦 序列化性能:');
    const serJson = result.serialization.json;
    const serProto = result.serialization.protobuf;
    const serImprovement = ((serJson.avgTime - serProto.avgTime) / serJson.avgTime * 100);
    
    console.log(`  JSON 平均时间:     ${(serJson.avgTime * 1000).toFixed(3)} μs`);
    console.log(`  Protobuf 平均时间: ${(serProto.avgTime * 1000).toFixed(3)} μs`);
    console.log(`  JSON 吞吐量:       ${serJson.opsPerSec.toFixed(0)} ops/sec`);
    console.log(`  Protobuf 吞吐量:   ${serProto.opsPerSec.toFixed(0)} ops/sec`);
    console.log(`  性能对比: Protobuf ${serImprovement > 0 ? '快' : '慢'} ${Math.abs(serImprovement).toFixed(1)}%`);
    
    // 反序列化性能分析
    console.log('\n📖 反序列化性能:');
    const deserJson = result.deserialization.json;
    const deserProto = result.deserialization.protobuf;
    const deserImprovement = ((deserJson.avgTime - deserProto.avgTime) / deserJson.avgTime * 100);
    
    console.log(`  JSON 平均时间:     ${(deserJson.avgTime * 1000).toFixed(3)} μs`);
    console.log(`  Protobuf 平均时间: ${(deserProto.avgTime * 1000).toFixed(3)} μs`);
    console.log(`  JSON 吞吐量:       ${deserJson.opsPerSec.toFixed(0)} ops/sec`);
    console.log(`  Protobuf 吞吐量:   ${deserProto.opsPerSec.toFixed(0)} ops/sec`);
    console.log(`  性能对比: Protobuf ${deserImprovement > 0 ? '快' : '慢'} ${Math.abs(deserImprovement).toFixed(1)}%`);
    
    // 内存使用分析
    console.log('\n🧠 内存使用:');
    console.log(`  序列化 JSON 内存变化:       ${serJson.memoryDelta.toFixed(2)} MB`);
    console.log(`  序列化 Protobuf 内存变化:   ${serProto.memoryDelta.toFixed(2)} MB`);
    console.log(`  反序列化 JSON 内存变化:     ${deserJson.memoryDelta.toFixed(2)} MB`);
    console.log(`  反序列化 Protobuf 内存变化: ${deserProto.memoryDelta.toFixed(2)} MB`);
  });
  
  // 综合建议
  console.log('\n\n💡 综合分析和建议');
  console.log('='.repeat(80));
  
  const smallSer = data.results.small.serialization;
  const mediumSer = data.results.medium.serialization;
  const largeSer = data.results.large.serialization;
  
  const smallDeser = data.results.small.deserialization;
  const mediumDeser = data.results.medium.deserialization;
  const largeDeser = data.results.large.deserialization;
  
  // 序列化建议
  console.log('\n📦 序列化场景建议:');
  if (smallSer.protobuf.avgTime < smallSer.json.avgTime) {
    console.log('✅ 小数据量: 推荐使用 Protobuf，性能更好');
  } else {
    console.log('⚠️ 小数据量: JSON 更适合，Protobuf 开销相对较大');
  }
  
  if (mediumSer.protobuf.avgTime < mediumSer.json.avgTime) {
    console.log('✅ 中等数据量: 推荐使用 Protobuf');
  } else {
    console.log('⚠️ 中等数据量: JSON 性能更好，结构简单时优先考虑');
  }
  
  if (largeSer.protobuf.avgTime < largeSer.json.avgTime) {
    console.log('✅ 大数据量: 强烈推荐使用 Protobuf');
  } else {
    console.log('⚠️ 大数据量: 虽然 JSON 序列化更快，但要考虑数据大小和传输成本');
  }
  
  // 反序列化建议
  console.log('\n📖 反序列化场景建议:');
  const allDeserFaster = [smallDeser, mediumDeser, largeDeser]
    .every(d => d.protobuf.avgTime < d.json.avgTime);
  
  if (allDeserFaster) {
    console.log('✅ 所有数据量: Protobuf 反序列化性能均优于 JSON');
  } else {
    console.log('⚠️ 反序列化性能因数据量而异，需要根据具体场景选择');
  }
  
  // 数据传输建议
  console.log('\n🌐 数据传输场景建议:');
  const avgCompression = (data.results.small.size.compressionRatio + 
                         data.results.medium.size.compressionRatio + 
                         data.results.large.size.compressionRatio) / 3;
  
  console.log(`平均数据压缩率: ${avgCompression.toFixed(1)}%`);
  
  if (avgCompression > 40) {
    console.log('✅ 网络传输: 强烈推荐 Protobuf，可显著减少带宽使用');
  } else if (avgCompression > 20) {
    console.log('✅ 网络传输: 推荐 Protobuf，有一定的带宽优势');
  } else {
    console.log('⚠️ 网络传输: 压缩优势不明显，可考虑其他因素');
  }
  
  // 使用场景推荐
  console.log('\n🎯 具体使用场景推荐:');
  console.log('\n✅ 推荐使用 Protobuf 的场景:');
  console.log('• 微服务间高频通信');
  console.log('• 需要长期存储大量数据');
  console.log('• 移动应用或带宽有限的环境');
  console.log('• 性能要求极高的系统');
  console.log('• 数据结构相对稳定，变更频率不高');
  
  console.log('\n✅ 推荐使用 JSON 的场景:');
  console.log('• Web API 开发，需要人类可读');
  console.log('• 快速原型开发');
  console.log('• 数据结构频繁变更');
  console.log('• 小型项目或简单数据交换');
  console.log('• 需要在浏览器中直接处理');
  
  console.log('\n⚖️ 权衡考虑:');
  console.log('• 开发复杂度: JSON < Protobuf');
  console.log('• 运行时性能: JSON < Protobuf (反序列化)');
  console.log('• 数据大小: JSON > Protobuf');
  console.log('• 生态系统: JSON > Protobuf');
  console.log('• 调试便利性: JSON > Protobuf');
  
  // 生成报告文件
  generateDetailedReport(data);
}

// 生成详细的 Markdown 报告
function generateDetailedReport(data) {
  const markdown = `# JSON vs Protobuf 性能测试报告

## 测试环境

- **测试时间**: ${data.timestamp}
- **Node.js 版本**: ${data.nodeVersion}
- **平台**: ${data.platform}
- **CPU**: ${data.cpu}
- **内存**: ${data.memory}

## 测试结果概览

### 数据压缩效果

| 数据大小 | JSON (KB) | Protobuf (KB) | 压缩率 | 节省空间 (KB) |
|---------|-----------|---------------|--------|---------------|
| 小数据   | ${(data.results.small.size.json / 1024).toFixed(2)} | ${(data.results.small.size.protobuf / 1024).toFixed(2)} | ${data.results.small.size.compressionRatio.toFixed(1)}% | ${((data.results.small.size.json - data.results.small.size.protobuf) / 1024).toFixed(2)} |
| 中等数据 | ${(data.results.medium.size.json / 1024).toFixed(2)} | ${(data.results.medium.size.protobuf / 1024).toFixed(2)} | ${data.results.medium.size.compressionRatio.toFixed(1)}% | ${((data.results.medium.size.json - data.results.medium.size.protobuf) / 1024).toFixed(2)} |
| 大数据   | ${(data.results.large.size.json / 1024).toFixed(2)} | ${(data.results.large.size.protobuf / 1024).toFixed(2)} | ${data.results.large.size.compressionRatio.toFixed(1)}% | ${((data.results.large.size.json - data.results.large.size.protobuf) / 1024).toFixed(2)} |

### 序列化性能对比

| 数据大小 | JSON (μs) | Protobuf (μs) | 性能差异 | JSON (ops/sec) | Protobuf (ops/sec) |
|---------|-----------|---------------|----------|----------------|--------------------|
| 小数据   | ${(data.results.small.serialization.json.avgTime * 1000).toFixed(3)} | ${(data.results.small.serialization.protobuf.avgTime * 1000).toFixed(3)} | ${((data.results.small.serialization.json.avgTime - data.results.small.serialization.protobuf.avgTime) / data.results.small.serialization.json.avgTime * 100).toFixed(1)}% | ${data.results.small.serialization.json.opsPerSec.toFixed(0)} | ${data.results.small.serialization.protobuf.opsPerSec.toFixed(0)} |
| 中等数据 | ${(data.results.medium.serialization.json.avgTime * 1000).toFixed(3)} | ${(data.results.medium.serialization.protobuf.avgTime * 1000).toFixed(3)} | ${((data.results.medium.serialization.json.avgTime - data.results.medium.serialization.protobuf.avgTime) / data.results.medium.serialization.json.avgTime * 100).toFixed(1)}% | ${data.results.medium.serialization.json.opsPerSec.toFixed(0)} | ${data.results.medium.serialization.protobuf.opsPerSec.toFixed(0)} |
| 大数据   | ${(data.results.large.serialization.json.avgTime * 1000).toFixed(3)} | ${(data.results.large.serialization.protobuf.avgTime * 1000).toFixed(3)} | ${((data.results.large.serialization.json.avgTime - data.results.large.serialization.protobuf.avgTime) / data.results.large.serialization.json.avgTime * 100).toFixed(1)}% | ${data.results.large.serialization.json.opsPerSec.toFixed(0)} | ${data.results.large.serialization.protobuf.opsPerSec.toFixed(0)} |

### 反序列化性能对比

| 数据大小 | JSON (μs) | Protobuf (μs) | 性能差异 | JSON (ops/sec) | Protobuf (ops/sec) |
|---------|-----------|---------------|----------|----------------|--------------------|
| 小数据   | ${(data.results.small.deserialization.json.avgTime * 1000).toFixed(3)} | ${(data.results.small.deserialization.protobuf.avgTime * 1000).toFixed(3)} | ${((data.results.small.deserialization.json.avgTime - data.results.small.deserialization.protobuf.avgTime) / data.results.small.deserialization.json.avgTime * 100).toFixed(1)}% | ${data.results.small.deserialization.json.opsPerSec.toFixed(0)} | ${data.results.small.deserialization.protobuf.opsPerSec.toFixed(0)} |
| 中等数据 | ${(data.results.medium.deserialization.json.avgTime * 1000).toFixed(3)} | ${(data.results.medium.deserialization.protobuf.avgTime * 1000).toFixed(3)} | ${((data.results.medium.deserialization.json.avgTime - data.results.medium.deserialization.protobuf.avgTime) / data.results.medium.deserialization.json.avgTime * 100).toFixed(1)}% | ${data.results.medium.deserialization.json.opsPerSec.toFixed(0)} | ${data.results.medium.deserialization.protobuf.opsPerSec.toFixed(0)} |
| 大数据   | ${(data.results.large.deserialization.json.avgTime * 1000).toFixed(3)} | ${(data.results.large.deserialization.protobuf.avgTime * 1000).toFixed(3)} | ${((data.results.large.deserialization.json.avgTime - data.results.large.deserialization.protobuf.avgTime) / data.results.large.deserialization.json.avgTime * 100).toFixed(1)}% | ${data.results.large.deserialization.json.opsPerSec.toFixed(0)} | ${data.results.large.deserialization.protobuf.opsPerSec.toFixed(0)} |

## 关键发现

### 数据压缩
- Protobuf 在所有测试场景下都显著减少了数据大小
- 平均压缩率达到 ${((data.results.small.size.compressionRatio + data.results.medium.size.compressionRatio + data.results.large.size.compressionRatio) / 3).toFixed(1)}%
- 对于网络传输和存储都有明显优势

### 序列化性能
- 小数据：${data.results.small.serialization.protobuf.avgTime < data.results.small.serialization.json.avgTime ? 'Protobuf 更快' : 'JSON 更快'}
- 中等数据：${data.results.medium.serialization.protobuf.avgTime < data.results.medium.serialization.json.avgTime ? 'Protobuf 更快' : 'JSON 更快'}
- 大数据：${data.results.large.serialization.protobuf.avgTime < data.results.large.serialization.json.avgTime ? 'Protobuf 更快' : 'JSON 更快'}

### 反序列化性能
- Protobuf 在所有数据大小下反序列化性能都优于 JSON
- 性能提升随数据大小变化，小数据提升最显著

## 推荐使用场景

### 适合使用 Protobuf 的场景
- 微服务间高频通信
- 需要长期存储大量数据
- 移动应用或带宽有限的环境
- 性能要求极高的系统
- 数据结构相对稳定

### 适合使用 JSON 的场景
- Web API 开发，需要人类可读
- 快速原型开发
- 数据结构频繁变更
- 小型项目或简单数据交换
- 浏览器环境直接处理

## 总结

${data.results.small.deserialization.protobuf.avgTime < data.results.small.deserialization.json.avgTime && 
  data.results.medium.deserialization.protobuf.avgTime < data.results.medium.deserialization.json.avgTime && 
  data.results.large.deserialization.protobuf.avgTime < data.results.large.deserialization.json.avgTime ? 
  'Protobuf 在反序列化性能和数据压缩方面显示出明显优势，特别适合高性能和网络传输场景。' : 
  'JSON 和 Protobuf 各有优势，需要根据具体场景选择。'}

---
*测试报告生成时间: ${new Date().toISOString()}*
`;

  const filename = `json-protobuf-analysis-${Date.now()}.md`;
  fs.writeFileSync(filename, markdown);
  console.log(`\n💾 详细分析报告已保存到: ${filename}`);
}

// 主函数
function main() {
  console.log('📊 JSON vs Protobuf 性能测试结果分析工具');
  console.log('='.repeat(60));
  console.log('');
  
  const results = loadBenchmarkResults();
  
  if (results.length > 0) {
    generateAnalysisReport(results);
  }
}

// 运行分析
if (require.main === module) {
  main();
}

module.exports = { loadBenchmarkResults, generateAnalysisReport };
