// Node.js 版本性能对比结果分析脚本

const fs = require('fs');
const path = require('path');

// 读取所有基准测试结果文件
function loadBenchmarkResults() {
  const files = fs.readdirSync(__dirname)
    .filter(file => file.startsWith('benchmark-result-node-') && file.endsWith('.json'))
    .sort();
  
  if (files.length === 0) {
    console.log('❌ 未找到任何基准测试结果文件');
    console.log('请先运行 ./run-version-comparison.sh 生成测试结果');
    return [];
  }
  
  console.log(`📁 找到 ${files.length} 个结果文件:`);
  files.forEach(file => console.log(`  - ${file}`));
  console.log('');
  
  return files.map(file => {
    const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
    return JSON.parse(content);
  });
}

// 计算性能提升百分比
function calculateImprovement(baseline, comparison) {
  return ((baseline - comparison) / baseline * 100);
}

// 格式化性能差异
function formatPerformanceDiff(baseline, comparison, metric = 'time') {
  const diff = calculateImprovement(baseline, comparison);
  const absDiff = Math.abs(diff);
  
  if (metric === 'time') {
    // 对于时间，正值表示减少时间（更好），负值表示增加时间（更差）
    return diff > 0 
      ? `快 ${absDiff.toFixed(1)}%` 
      : `慢 ${absDiff.toFixed(1)}%`;
  } else {
    // 对于吞吐量，负值表示降低（更差），正值表示提高（更好）
    return diff < 0 
      ? `低 ${absDiff.toFixed(1)}%` 
      : `高 ${absDiff.toFixed(1)}%`;
  }
}

// 生成对比报告
function generateComparisonReport(results) {
  if (results.length < 2) {
    console.log('❌ 需要至少 2 个版本的测试结果才能进行对比');
    return;
  }
  
  // 按 Node.js 版本排序
  results.sort((a, b) => {
    const versionA = parseFloat(a.nodeVersion.replace('v', ''));
    const versionB = parseFloat(b.nodeVersion.replace('v', ''));
    return versionA - versionB;
  });
  
  console.log('📊 Node.js 版本 JSON 反序列化性能对比报告');
  console.log('='.repeat(80));
  console.log(`生成时间: ${new Date().toISOString()}`);
  console.log('');
  
  // 显示测试环境信息
  console.log('🖥️ 测试环境信息:');
  console.log(`平台: ${results[0].platform}`);
  console.log(`CPU: ${results[0].cpu}`);
  console.log(`内存: ${results[0].memory}`);
  console.log('');
  
  // 显示版本信息
  console.log('📋 测试版本:');
  results.forEach(result => {
    console.log(`  • Node.js ${result.nodeVersion} (V8 ${result.v8Version})`);
  });
  console.log('');
  
  // 数据大小对比
  const testSizes = ['small', 'medium', 'large'];
  
  testSizes.forEach(size => {
    console.log(`📈 ${size.toUpperCase()} 数据性能对比 (${results[0].results[size].dataSize})`);
    console.log('─'.repeat(60));
    
    // 显示各版本的绝对性能
    console.log('绝对性能:');
    results.forEach(result => {
      const data = result.results[size];
      console.log(`  Node.js ${result.nodeVersion.padEnd(8)} | 平均时间: ${data.avgTime.padEnd(12)} | 吞吐量: ${data.opsPerSec} ops/sec`);
    });
    
    // 计算相对性能提升（以最旧版本为基准）
    if (results.length >= 2) {
      console.log('\n相对性能提升:');
      const baseline = results[0]; // 最旧版本作为基准
      
      for (let i = 1; i < results.length; i++) {
        const current = results[i];
        const baselineTime = parseFloat(baseline.results[size].avgTime.split(' ')[0]);
        const currentTime = parseFloat(current.results[size].avgTime.split(' ')[0]);
        const baselineOps = parseInt(baseline.results[size].opsPerSec.replace(/,/g, ''));
        const currentOps = parseInt(current.results[size].opsPerSec.replace(/,/g, ''));
        
        const timeDiff = formatPerformanceDiff(baselineTime, currentTime, 'time');
        const opsDiff = formatPerformanceDiff(currentOps, baselineOps, 'ops');
        
        console.log(`  Node.js ${current.nodeVersion} vs ${baseline.nodeVersion}: 时间${timeDiff}, 吞吐量${opsDiff}`);
      }
    }
    console.log('');
  });
  
  // 生成详细分析
  console.log('🔍 详细分析');
  console.log('─'.repeat(60));
  
  if (results.length === 2) {
    const [older, newer] = results;
    console.log(`对比 Node.js ${older.nodeVersion} 和 ${newer.nodeVersion}:`);
    console.log('');
    
    testSizes.forEach(size => {
      const olderTime = parseFloat(older.results[size].avgTime.split(' ')[0]);
      const newerTime = parseFloat(newer.results[size].avgTime.split(' ')[0]);
      const improvement = calculateImprovement(olderTime, newerTime);
      
      console.log(`${size.toUpperCase()} 数据:`);
      console.log(`  • 性能变化: ${improvement > 0 ? '提升' : '下降'} ${Math.abs(improvement).toFixed(1)}%`);
      console.log(`  • 时间对比: ${olderTime.toFixed(6)}ms → ${newerTime.toFixed(6)}ms`);
      
      if (improvement > 5) {
        console.log(`  • ✅ 显著性能提升`);
      } else if (improvement < -5) {
        console.log(`  • ⚠️ 性能有所下降`);
      } else {
        console.log(`  • ➡️ 性能变化较小`);
      }
      console.log('');
    });
  }
  
  // 保存对比报告
  const reportData = {
    generatedAt: new Date().toISOString(),
    environment: {
      platform: results[0].platform,
      cpu: results[0].cpu,
      memory: results[0].memory
    },
    versions: results.map(r => ({
      node: r.nodeVersion,
      v8: r.v8Version
    })),
    comparison: {}
  };
  
  testSizes.forEach(size => {
    reportData.comparison[size] = results.map(r => ({
      version: r.nodeVersion,
      dataSize: r.results[size].dataSize,
      avgTime: r.results[size].avgTime,
      opsPerSec: r.results[size].opsPerSec
    }));
  });
  
  const reportFilename = `comparison-report-${Date.now()}.json`;
  fs.writeFileSync(reportFilename, JSON.stringify(reportData, null, 2));
  console.log(`💾 详细对比报告已保存到: ${reportFilename}`);
  
  // 生成 Markdown 报告
  generateMarkdownReport(reportData, results);
}

// 生成 Markdown 格式的报告
function generateMarkdownReport(reportData, results) {
  const testSizes = ['small', 'medium', 'large'];
  
  let markdown = `# Node.js 版本 JSON 反序列化性能对比报告

## 测试概述

本报告对比了不同 Node.js 版本在 JSON 反序列化性能上的差异。

### 测试环境

- **平台**: ${reportData.environment.platform}
- **CPU**: ${reportData.environment.cpu}
- **内存**: ${reportData.environment.memory}
- **测试时间**: ${reportData.generatedAt}

### 测试版本

${reportData.versions.map(v => `- **Node.js ${v.node}** (V8 ${v.v8})`).join('\n')}

## 性能测试结果

`;

  testSizes.forEach(size => {
    const sizeData = reportData.comparison[size];
    markdown += `### ${size.toUpperCase()} 数据测试 (${sizeData[0].dataSize})

| Node.js 版本 | 平均时间 | 吞吐量 |
|-------------|----------|--------|
${sizeData.map(d => `| ${d.version} | ${d.avgTime} | ${d.opsPerSec} ops/sec |`).join('\n')}

`;

    if (sizeData.length >= 2) {
      const baseline = sizeData[0];
      const latest = sizeData[sizeData.length - 1];
      const baselineTime = parseFloat(baseline.avgTime.split(' ')[0]);
      const latestTime = parseFloat(latest.avgTime.split(' ')[0]);
      const improvement = calculateImprovement(baselineTime, latestTime);
      
      markdown += `**性能变化**: Node.js ${latest.version} 相比 ${baseline.version} ${improvement > 0 ? '快' : '慢'} ${Math.abs(improvement).toFixed(1)}%

`;
    }
  });

  markdown += `## 结论

`;

  if (results.length === 2) {
    const [older, newer] = results;
    const improvements = testSizes.map(size => {
      const olderTime = parseFloat(older.results[size].avgTime.split(' ')[0]);
      const newerTime = parseFloat(newer.results[size].avgTime.split(' ')[0]);
      return calculateImprovement(olderTime, newerTime);
    });
    
    const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
    
    if (avgImprovement > 5) {
      markdown += `✅ **Node.js ${newer.nodeVersion} 相比 ${older.nodeVersion} 在 JSON 反序列化性能上有显著提升**，平均性能提升约 ${avgImprovement.toFixed(1)}%。

`;
    } else if (avgImprovement < -5) {
      markdown += `⚠️ **Node.js ${newer.nodeVersion} 相比 ${older.nodeVersion} 在 JSON 反序列化性能上有所下降**，平均性能下降约 ${Math.abs(avgImprovement).toFixed(1)}%。

`;
    } else {
      markdown += `➡️ **Node.js ${newer.nodeVersion} 相比 ${older.nodeVersion} 在 JSON 反序列化性能上变化较小**，差异在误差范围内。

`;
    }
  }

  markdown += `### 建议

1. **生产环境选择**: 根据测试结果选择最适合的 Node.js 版本
2. **性能优化**: 对于大量 JSON 处理的应用，版本选择会对性能产生明显影响
3. **持续监控**: 定期进行性能测试，确保应用性能符合预期

---

*本报告由自动化测试工具生成，测试结果仅供参考。实际性能可能因具体应用场景而异。*
`;

  const markdownFilename = `node-version-comparison-${Date.now()}.md`;
  fs.writeFileSync(markdownFilename, markdown);
  console.log(`📄 Markdown 报告已保存到: ${markdownFilename}`);
}

// 主函数
function main() {
  console.log('📊 Node.js 版本性能对比分析工具');
  console.log('='.repeat(50));
  console.log('');
  
  const results = loadBenchmarkResults();
  
  if (results.length > 0) {
    generateComparisonReport(results);
  }
}

// 运行分析
if (require.main === module) {
  main();
}

module.exports = { loadBenchmarkResults, generateComparisonReport };
