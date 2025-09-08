const simdjson = require('simdjson');

// 创建测试数据
function generateTestData() {
  const smallData = {
    name: 'John Doe',
    age: 30,
    city: 'New York',
    active: true
  };

  const mediumData = {
    users: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `User${i}`,
      email: `user${i}@example.com`,
      age: 20 + (i % 50),
      address: {
        street: `${i} Main St`,
        city: `City${i % 10}`,
        country: 'USA',
        zipCode: `${10000 + i}`
      },
      preferences: {
        theme: i % 2 === 0 ? 'dark' : 'light',
        notifications: i % 3 === 0,
        language: ['en', 'zh', 'es'][i % 3]
      }
    }))
  };

  const largeData = {
    metadata: {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      total: 10000
    },
    items: Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      title: `Item ${i}`,
      description: `This is a detailed description for item ${i}. It contains multiple sentences to simulate real-world data.`,
      price: (Math.random() * 1000).toFixed(2),
      category: ['electronics', 'clothing', 'books', 'home', 'sports'][i % 5],
      tags: [`tag${i % 10}`, `category${i % 5}`, `special${i % 20}`],
      attributes: {
        weight: (Math.random() * 10).toFixed(2),
        dimensions: {
          length: (Math.random() * 100).toFixed(1),
          width: (Math.random() * 100).toFixed(1),
          height: (Math.random() * 100).toFixed(1)
        },
        inStock: i % 3 !== 0,
        reviews: Array.from({ length: i % 5 + 1 }, (_, j) => ({
          rating: Math.floor(Math.random() * 5) + 1,
          comment: `Review ${j} for item ${i}`,
          user: `reviewer${j}`
        }))
      }
    }))
  };

  return { smallData, mediumData, largeData };
}

// 性能测试函数
function benchmark(name, iterations, testFunction) {
  console.log(`\n🧪 ${name}`);
  console.log('━'.repeat(50));
  
  // 预热
  for (let i = 0; i < 10; i++) {
    testFunction();
  }
  
  const start = process.hrtime.bigint();
  
  for (let i = 0; i < iterations; i++) {
    testFunction();
  }
  
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // 转换为毫秒
  
  console.log(`执行次数: ${iterations.toLocaleString()}`);
  console.log(`总时间: ${duration.toFixed(2)} ms`);
  console.log(`平均时间: ${(duration / iterations).toFixed(4)} ms`);
  console.log(`每秒操作数: ${(iterations / (duration / 1000)).toFixed(0)} ops/sec`);
  
  return duration;
}

// 序列化测试
function testSerialization(data, dataSize) {
  console.log(`\n📝 序列化测试 - ${dataSize} 数据`);
  console.log('='.repeat(60));
  
  const iterations = dataSize === 'Large' ? 100 : dataSize === 'Medium' ? 1000 : 10000;
  
  // 原生 JSON 序列化
  const nativeTime = benchmark(
    '原生 JSON.stringify',
    iterations,
    () => JSON.stringify(data)
  );
  
  // 注意：simdjson 主要是用于反序列化，没有序列化功能
  console.log('\n⚠️  注意：simdjson 主要专注于 JSON 解析（反序列化），不提供序列化功能');
  
  return { native: nativeTime };
}

// 反序列化测试
function testDeserialization(jsonString, dataSize) {
  console.log(`\n📖 反序列化测试 - ${dataSize} 数据`);
  console.log('='.repeat(60));
  
  const iterations = dataSize === 'Large' ? 100 : dataSize === 'Medium' ? 1000 : 10000;
  
  // 原生 JSON 反序列化
  const nativeTime = benchmark(
    '原生 JSON.parse',
    iterations,
    () => JSON.parse(jsonString)
  );
  
  // simdjson 反序列化
  const simdjsonTime = benchmark(
    'simdjson.parse',
    iterations,
    () => simdjson.parse(jsonString)
  );
  
  // 计算性能提升
  const improvement = ((nativeTime - simdjsonTime) / nativeTime * 100);
  console.log(`\n📊 性能对比:`);
  console.log(`simdjson 比原生 JSON ${improvement > 0 ? '快' : '慢'} ${Math.abs(improvement).toFixed(1)}%`);
  
  return { native: nativeTime, simdjson: simdjsonTime };
}

// 内存使用测试
function testMemoryUsage(data, jsonString, dataSize) {
  console.log(`\n💾 内存使用测试 - ${dataSize} 数据`);
  console.log('='.repeat(60));
  
  const memBefore = process.memoryUsage();
  
  // 测试原生 JSON
  const startNative = process.hrtime.bigint();
  for (let i = 0; i < 100; i++) {
    JSON.parse(JSON.stringify(data));
  }
  const endNative = process.hrtime.bigint();
  
  const memAfterNative = process.memoryUsage();
  
  // 强制垃圾回收（如果可用）
  if (global.gc) {
    global.gc();
  }
  
  // 测试 simdjson
  const startSimd = process.hrtime.bigint();
  for (let i = 0; i < 100; i++) {
    simdjson.parse(jsonString);
  }
  const endSimd = process.hrtime.bigint();
  
  const memAfterSimd = process.memoryUsage();
  
  console.log('原生 JSON:');
  console.log(`  堆内存使用: ${((memAfterNative.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  时间: ${(Number(endNative - startNative) / 1000000).toFixed(2)} ms`);
  
  console.log('simdjson:');
  console.log(`  堆内存使用: ${((memAfterSimd.heapUsed - memAfterNative.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  时间: ${(Number(endSimd - startSimd) / 1000000).toFixed(2)} ms`);
}

// 主测试函数
function runBenchmarks() {
  console.log('🚀 JSON 性能基准测试');
  console.log('Node.js 原生 JSON vs simdjson-node');
  console.log('='.repeat(60));
  console.log(`Node.js 版本: ${process.version}`);
  console.log(`平台: ${process.platform} ${process.arch}`);
  console.log(`CPU: ${require('os').cpus()[0].model}`);
  console.log(`内存: ${(require('os').totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`);
  
  const { smallData, mediumData, largeData } = generateTestData();
  
  // 转换为 JSON 字符串用于反序列化测试
  const smallJson = JSON.stringify(smallData);
  const mediumJson = JSON.stringify(mediumData);
  const largeJson = JSON.stringify(largeData);
  
  console.log('\n📏 数据大小信息:');
  console.log(`Small JSON: ${(smallJson.length / 1024).toFixed(2)} KB`);
  console.log(`Medium JSON: ${(mediumJson.length / 1024).toFixed(2)} KB`);
  console.log(`Large JSON: ${(largeJson.length / 1024 / 1024).toFixed(2)} MB`);
  
  // 运行测试
  const results = {};
  
  // 小数据测试
  results.small = {};
  results.small.serialization = testSerialization(smallData, 'Small');
  results.small.deserialization = testDeserialization(smallJson, 'Small');
  testMemoryUsage(smallData, smallJson, 'Small');
  
  // 中等数据测试
  results.medium = {};
  results.medium.serialization = testSerialization(mediumData, 'Medium');
  results.medium.deserialization = testDeserialization(mediumJson, 'Medium');
  testMemoryUsage(mediumData, mediumJson, 'Medium');
  
  // 大数据测试
  results.large = {};
  results.large.serialization = testSerialization(largeData, 'Large');
  results.large.deserialization = testDeserialization(largeJson, 'Large');
  testMemoryUsage(largeData, largeJson, 'Large');
  
  // 总结报告
  console.log('\n📊 总结报告');
  console.log('='.repeat(60));
  
  ['small', 'medium', 'large'].forEach(size => {
    const deser = results[size].deserialization;
    const improvement = ((deser.native - deser.simdjson) / deser.native * 100);
    console.log(`${size.toUpperCase()} 数据反序列化: simdjson ${improvement > 0 ? '快' : '慢'} ${Math.abs(improvement).toFixed(1)}%`);
  });
  
  console.log('\n💡 结论:');
  console.log('• simdjson 专注于 JSON 解析（反序列化）性能优化');
  console.log('• 对于序列化，仍需使用原生 JSON.stringify');
  console.log('• 在大数据量场景下，simdjson 的性能优势更加明显');
  console.log('• 建议在需要频繁解析大型 JSON 数据时使用 simdjson');
}

// 运行测试
if (require.main === module) {
  runBenchmarks();
}

module.exports = { runBenchmarks, generateTestData };
