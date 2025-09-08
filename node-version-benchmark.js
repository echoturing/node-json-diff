// Node.js 版本 JSON 反序列化性能对比测试
// 专注测试原生 JSON.parse 在不同 Node.js 版本间的性能差异

const fs = require('fs');
const path = require('path');
const os = require('os');

// 创建测试数据
function generateTestData() {
  const smallData = {
    name: 'John Doe',
    age: 30,
    city: 'New York',
    active: true,
    timestamp: new Date().toISOString()
  };

  const mediumData = {
    metadata: {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      total: 1000
    },
    users: Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `User${i}`,
      email: `user${i}@example.com`,
      age: 20 + (i % 50),
      score: Math.random() * 100,
      active: i % 3 === 0,
      address: {
        street: `${i} Main St`,
        city: `City${i % 10}`,
        country: 'USA',
        zipCode: `${10000 + i}`
      },
      preferences: {
        theme: i % 2 === 0 ? 'dark' : 'light',
        notifications: i % 3 === 0,
        language: ['en', 'zh', 'es', 'fr', 'de'][i % 5],
        tags: [`tag${i % 20}`, `category${i % 10}`, `special${i % 5}`]
      },
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }))
  };

  const largeData = {
    metadata: {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      total: 10000,
      source: 'performance-test'
    },
    items: Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      uuid: `uuid-${i}-${Math.random().toString(36).substr(2, 9)}`,
      title: `Item ${i}`,
      description: `This is a detailed description for item ${i}. It contains multiple sentences to simulate real-world data with varying lengths and complexity.`,
      price: parseFloat((Math.random() * 1000).toFixed(2)),
      originalPrice: parseFloat((Math.random() * 1200).toFixed(2)),
      discount: Math.floor(Math.random() * 50),
      category: ['electronics', 'clothing', 'books', 'home', 'sports', 'toys', 'beauty', 'automotive'][i % 8],
      tags: Array.from({ length: (i % 5) + 1 }, (_, j) => `tag${(i + j) % 50}`),
      inStock: i % 4 !== 0,
      stockCount: Math.floor(Math.random() * 1000),
      rating: parseFloat((Math.random() * 5).toFixed(1)),
      reviewCount: Math.floor(Math.random() * 500),
      attributes: {
        weight: parseFloat((Math.random() * 10).toFixed(2)),
        dimensions: {
          length: parseFloat((Math.random() * 100).toFixed(1)),
          width: parseFloat((Math.random() * 100).toFixed(1)),
          height: parseFloat((Math.random() * 100).toFixed(1))
        },
        color: ['red', 'blue', 'green', 'yellow', 'black', 'white'][i % 6],
        material: ['plastic', 'metal', 'wood', 'fabric', 'glass'][i % 5],
        origin: ['China', 'USA', 'Germany', 'Japan', 'Italy'][i % 5]
      },
      vendor: {
        id: Math.floor(i / 100),
        name: `Vendor ${Math.floor(i / 100)}`,
        contact: `vendor${Math.floor(i / 100)}@example.com`,
        address: {
          street: `${Math.floor(i / 100)} Vendor St`,
          city: `VendorCity${Math.floor(i / 100) % 20}`,
          country: 'Global'
        }
      },
      lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }))
  };

  return { smallData, mediumData, largeData };
}

// 高精度性能测试函数
function benchmark(name, iterations, testFunction, warmupRuns = 100) {
  console.log(`\n🧪 ${name}`);
  console.log('━'.repeat(50));
  
  // 预热运行
  for (let i = 0; i < warmupRuns; i++) {
    testFunction();
  }
  
  // 强制垃圾回收（如果可用）
  if (global.gc) {
    global.gc();
  }
  
  const start = process.hrtime.bigint();
  
  for (let i = 0; i < iterations; i++) {
    testFunction();
  }
  
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // 转换为毫秒
  
  console.log(`执行次数: ${iterations.toLocaleString()}`);
  console.log(`总时间: ${duration.toFixed(2)} ms`);
  console.log(`平均时间: ${(duration / iterations).toFixed(6)} ms`);
  console.log(`每秒操作数: ${(iterations / (duration / 1000)).toLocaleString()} ops/sec`);
  
  return {
    iterations,
    totalTime: duration,
    avgTime: duration / iterations,
    opsPerSec: iterations / (duration / 1000)
  };
}

// JSON 反序列化测试
function testJSONParsing(jsonString, dataSize, testConfig) {
  console.log(`\n📖 JSON.parse 性能测试 - ${dataSize} 数据`);
  console.log('='.repeat(60));
  
  const iterations = testConfig.iterations;
  const warmupRuns = testConfig.warmup;
  
  // 测试 JSON.parse
  const result = benchmark(
    `原生 JSON.parse (${jsonString.length.toLocaleString()} 字符)`,
    iterations,
    () => JSON.parse(jsonString),
    warmupRuns
  );
  
  return result;
}

// 内存使用情况监控
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(usage.external / 1024 / 1024 * 100) / 100
  };
}

// 主测试函数
function runNodeVersionBenchmark() {
  console.log('🚀 Node.js 版本 JSON 反序列化性能基准测试');
  console.log('='.repeat(70));
  console.log(`Node.js 版本: ${process.version}`);
  console.log(`V8 版本: ${process.versions.v8}`);
  console.log(`平台: ${process.platform} ${process.arch}`);
  console.log(`CPU: ${os.cpus()[0].model}`);
  console.log(`内存: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`);
  console.log(`测试时间: ${new Date().toISOString()}`);
  
  const memoryBefore = getMemoryUsage();
  console.log(`\n💾 测试前内存使用:`, memoryBefore);
  
  const { smallData, mediumData, largeData } = generateTestData();
  
  // 转换为 JSON 字符串
  const smallJson = JSON.stringify(smallData);
  const mediumJson = JSON.stringify(mediumData);
  const largeJson = JSON.stringify(largeData);
  
  console.log('\n📏 数据大小信息:');
  console.log(`Small JSON: ${(smallJson.length / 1024).toFixed(2)} KB (${smallJson.length.toLocaleString()} 字符)`);
  console.log(`Medium JSON: ${(mediumJson.length / 1024).toFixed(2)} KB (${mediumJson.length.toLocaleString()} 字符)`);
  console.log(`Large JSON: ${(largeJson.length / 1024 / 1024).toFixed(2)} MB (${largeJson.length.toLocaleString()} 字符)`);
  
  // 测试配置 - 调整为更快的测试
  const testConfigs = {
    small: { iterations: 50000, warmup: 500 },
    medium: { iterations: 1000, warmup: 50 },
    large: { iterations: 100, warmup: 5 }
  };
  
  const results = {};
  
  // 小数据测试
  results.small = testJSONParsing(smallJson, 'Small', testConfigs.small);
  
  // 中等数据测试
  results.medium = testJSONParsing(mediumJson, 'Medium', testConfigs.medium);
  
  // 大数据测试
  results.large = testJSONParsing(largeJson, 'Large', testConfigs.large);
  
  const memoryAfter = getMemoryUsage();
  console.log(`\n💾 测试后内存使用:`, memoryAfter);
  
  // 生成结果摘要
  console.log('\n📊 测试结果摘要');
  console.log('='.repeat(60));
  
  const summary = {
    nodeVersion: process.version,
    v8Version: process.versions.v8,
    platform: `${process.platform} ${process.arch}`,
    cpu: os.cpus()[0].model,
    memory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`,
    timestamp: new Date().toISOString(),
    memoryUsage: {
      before: memoryBefore,
      after: memoryAfter
    },
    results: {
      small: {
        dataSize: `${(smallJson.length / 1024).toFixed(2)} KB`,
        iterations: results.small.iterations,
        avgTime: `${results.small.avgTime.toFixed(6)} ms`,
        opsPerSec: Math.round(results.small.opsPerSec).toLocaleString()
      },
      medium: {
        dataSize: `${(mediumJson.length / 1024).toFixed(2)} KB`,
        iterations: results.medium.iterations,
        avgTime: `${results.medium.avgTime.toFixed(6)} ms`,
        opsPerSec: Math.round(results.medium.opsPerSec).toLocaleString()
      },
      large: {
        dataSize: `${(largeJson.length / 1024 / 1024).toFixed(2)} MB`,
        iterations: results.large.iterations,
        avgTime: `${results.large.avgTime.toFixed(6)} ms`,
        opsPerSec: Math.round(results.large.opsPerSec).toLocaleString()
      }
    }
  };
  
  Object.entries(summary.results).forEach(([size, data]) => {
    console.log(`${size.toUpperCase()} 数据 (${data.dataSize}): ${data.avgTime} 平均时间, ${data.opsPerSec} ops/sec`);
  });
  
  // 保存结果到文件
  const filename = `benchmark-result-node-${process.version.replace(/[^0-9]/g, '')}.json`;
  fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(summary, null, 2));
  console.log(`\n💾 结果已保存到: ${filename}`);
  
  return summary;
}

// 运行测试
if (require.main === module) {
  runNodeVersionBenchmark();
}

module.exports = { runNodeVersionBenchmark, generateTestData, benchmark };
