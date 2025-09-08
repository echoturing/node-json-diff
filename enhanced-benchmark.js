const simdjson = require('simdjson');
const fastJsonStringify = require('fast-json-stringify');

// 定义 schema 用于 fast-json-stringify
const schemas = {
  small: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
      city: { type: 'string' },
      active: { type: 'boolean' }
    }
  },
  medium: {
    type: 'object',
    properties: {
      users: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            email: { type: 'string' },
            age: { type: 'number' },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                country: { type: 'string' },
                zipCode: { type: 'string' }
              }
            },
            preferences: {
              type: 'object',
              properties: {
                theme: { type: 'string' },
                notifications: { type: 'boolean' },
                language: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
};

// 创建预编译的序列化函数
const fastStringifySmall = fastJsonStringify(schemas.small);
const fastStringifyMedium = fastJsonStringify(schemas.medium);

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
      total: 5000 // 减少数据量以便测试
    },
    items: Array.from({ length: 5000 }, (_, i) => ({
      id: i,
      title: `Item ${i}`,
      description: `This is a detailed description for item ${i}.`,
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
        reviews: Array.from({ length: Math.min(i % 3 + 1, 2) }, (_, j) => ({
          rating: Math.floor(Math.random() * 5) + 1,
          comment: `Review ${j} for item ${i}`,
          user: `reviewer${j}`
        }))
      }
    }))
  };

  return { smallData, mediumData, largeData };
}

// 高精度性能测试函数
function precisionBenchmark(name, iterations, testFunction) {
  console.log(`\n🧪 ${name}`);
  console.log('━'.repeat(50));
  
  // 预热阶段，更多次数
  for (let i = 0; i < 100; i++) {
    testFunction();
  }
  
  // 强制垃圾回收
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
  console.log(`总时间: ${duration.toFixed(3)} ms`);
  console.log(`平均时间: ${(duration / iterations).toFixed(6)} ms`);
  console.log(`每秒操作数: ${(iterations / (duration / 1000)).toFixed(0)} ops/sec`);
  
  return duration;
}

// 序列化性能测试
function testSerialization(data, dataSize, fastStringify = null) {
  console.log(`\n📝 序列化测试 - ${dataSize} 数据`);
  console.log('='.repeat(60));
  
  const iterations = dataSize === 'Large' ? 200 : dataSize === 'Medium' ? 2000 : 20000;
  
  // 原生 JSON 序列化
  const nativeTime = precisionBenchmark(
    '原生 JSON.stringify',
    iterations,
    () => JSON.stringify(data)
  );
  
  // fast-json-stringify 序列化（如果提供了 schema）
  let fastTime = null;
  if (fastStringify) {
    fastTime = precisionBenchmark(
      'fast-json-stringify',
      iterations,
      () => fastStringify(data)
    );
    
    const improvement = ((nativeTime - fastTime) / nativeTime * 100);
    console.log(`\n📊 序列化性能对比:`);
    console.log(`fast-json-stringify 比原生 JSON ${improvement > 0 ? '快' : '慢'} ${Math.abs(improvement).toFixed(1)}%`);
  }
  
  return { native: nativeTime, fast: fastTime };
}

// 反序列化性能测试
function testDeserialization(jsonString, dataSize) {
  console.log(`\n📖 反序列化测试 - ${dataSize} 数据`);
  console.log('='.repeat(60));
  
  const iterations = dataSize === 'Large' ? 200 : dataSize === 'Medium' ? 2000 : 20000;
  
  // 原生 JSON 反序列化
  const nativeTime = precisionBenchmark(
    '原生 JSON.parse',
    iterations,
    () => JSON.parse(jsonString)
  );
  
  // simdjson 反序列化
  const simdjsonTime = precisionBenchmark(
    'simdjson.parse',
    iterations,
    () => simdjson.parse(jsonString)
  );
  
  // 计算性能提升
  const improvement = ((nativeTime - simdjsonTime) / nativeTime * 100);
  console.log(`\n📊 反序列化性能对比:`);
  console.log(`simdjson 比原生 JSON ${improvement > 0 ? '快' : '慢'} ${Math.abs(improvement).toFixed(1)}%`);
  
  return { native: nativeTime, simdjson: simdjsonTime };
}

// 正确性验证
function validateCorrectness(data, jsonString, fastStringify = null) {
  console.log('\n🔍 正确性验证:');
  
  // 验证序列化结果
  const nativeResult = JSON.stringify(data);
  if (fastStringify) {
    const fastResult = fastStringify(data);
    const nativeParsed = JSON.parse(nativeResult);
    const fastParsed = JSON.parse(fastResult);
    console.log(`序列化结果一致性: ${JSON.stringify(nativeParsed) === JSON.stringify(fastParsed) ? '✅ 通过' : '❌ 失败'}`);
  }
  
  // 验证反序列化结果
  const nativeParsed = JSON.parse(jsonString);
  const simdjsonParsed = simdjson.parse(jsonString);
  console.log(`反序列化结果一致性: ${JSON.stringify(nativeParsed) === JSON.stringify(simdjsonParsed) ? '✅ 通过' : '❌ 失败'}`);
}

// 内存使用测试
function testMemoryUsage(data, jsonString, dataSize, fastStringify = null) {
  console.log(`\n💾 内存使用测试 - ${dataSize} 数据`);
  console.log('='.repeat(60));
  
  const iterations = 50;
  
  // 强制垃圾回收
  if (global.gc) {
    global.gc();
  }
  
  const initialMemory = process.memoryUsage();
  
  // 测试原生 JSON
  const startTime1 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    const str = JSON.stringify(data);
    JSON.parse(str);
  }
  const endTime1 = process.hrtime.bigint();
  
  const afterNativeMemory = process.memoryUsage();
  
  // 测试优化库
  const startTime2 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    const str = fastStringify ? fastStringify(data) : JSON.stringify(data);
    simdjson.parse(str);
  }
  const endTime2 = process.hrtime.bigint();
  
  const afterOptimizedMemory = process.memoryUsage();
  
  console.log('原生 JSON (stringify + parse):');
  console.log(`  堆内存变化: ${((afterNativeMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  时间: ${(Number(endTime1 - startTime1) / 1000000).toFixed(2)} ms`);
  
  console.log('优化库 (fast-stringify + simdjson):');
  console.log(`  堆内存变化: ${((afterOptimizedMemory.heapUsed - afterNativeMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  时间: ${(Number(endTime2 - startTime2) / 1000000).toFixed(2)} ms`);
}

// 主测试函数
function runEnhancedBenchmarks() {
  console.log('🚀 增强版 JSON 性能基准测试');
  console.log('Node.js 原生 JSON vs 优化库 (simdjson + fast-json-stringify)');
  console.log('='.repeat(70));
  console.log(`Node.js 版本: ${process.version}`);
  console.log(`平台: ${process.platform} ${process.arch}`);
  console.log(`CPU: ${require('os').cpus()[0].model}`);
  console.log(`内存: ${(require('os').totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`);
  console.log(`垃圾回收: ${global.gc ? '✅ 可用' : '❌ 不可用 (建议使用 --expose-gc 运行)'}`);
  
  const { smallData, mediumData, largeData } = generateTestData();
  
  // 转换为 JSON 字符串用于反序列化测试
  const smallJson = JSON.stringify(smallData);
  const mediumJson = JSON.stringify(mediumData);
  const largeJson = JSON.stringify(largeData);
  
  console.log('\n📏 数据大小信息:');
  console.log(`Small JSON: ${(smallJson.length / 1024).toFixed(2)} KB`);
  console.log(`Medium JSON: ${(mediumJson.length / 1024).toFixed(2)} KB`);
  console.log(`Large JSON: ${(largeJson.length / 1024 / 1024).toFixed(2)} MB`);
  
  const results = {};
  
  // 小数据测试
  console.log('\n' + '🔸'.repeat(30) + ' 小数据测试 ' + '🔸'.repeat(30));
  validateCorrectness(smallData, smallJson, fastStringifySmall);
  results.small = {};
  results.small.serialization = testSerialization(smallData, 'Small', fastStringifySmall);
  results.small.deserialization = testDeserialization(smallJson, 'Small');
  testMemoryUsage(smallData, smallJson, 'Small', fastStringifySmall);
  
  // 中等数据测试
  console.log('\n' + '🔸'.repeat(30) + ' 中等数据测试 ' + '🔸'.repeat(30));
  validateCorrectness(mediumData, mediumJson, fastStringifyMedium);
  results.medium = {};
  results.medium.serialization = testSerialization(mediumData, 'Medium', fastStringifyMedium);
  results.medium.deserialization = testDeserialization(mediumJson, 'Medium');
  testMemoryUsage(mediumData, mediumJson, 'Medium', fastStringifyMedium);
  
  // 大数据测试
  console.log('\n' + '🔸'.repeat(30) + ' 大数据测试 ' + '🔸'.repeat(30));
  validateCorrectness(largeData, largeJson);
  results.large = {};
  results.large.serialization = testSerialization(largeData, 'Large');
  results.large.deserialization = testDeserialization(largeJson, 'Large');
  testMemoryUsage(largeData, largeJson, 'Large');
  
  // 生成综合报告
  console.log('\n' + '📊'.repeat(20) + ' 综合性能报告 ' + '📊'.repeat(20));
  console.log('='.repeat(70));
  
  // 序列化性能总结
  console.log('\n🏃‍♂️ 序列化性能 (fast-json-stringify vs 原生):');
  ['small', 'medium'].forEach(size => {
    const ser = results[size].serialization;
    if (ser.fast) {
      const improvement = ((ser.native - ser.fast) / ser.native * 100);
      console.log(`  ${size.toUpperCase()}: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}% ${improvement > 0 ? '🔥' : '🐌'}`);
    }
  });
  
  // 反序列化性能总结
  console.log('\n🏃‍♀️ 反序列化性能 (simdjson vs 原生):');
  ['small', 'medium', 'large'].forEach(size => {
    const deser = results[size].deserialization;
    const improvement = ((deser.native - deser.simdjson) / deser.native * 100);
    console.log(`  ${size.toUpperCase()}: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}% ${improvement > 0 ? '🔥' : '🐌'}`);
  });
  
  // 建议
  console.log('\n💡 性能优化建议:');
  const avgSerImprovement = (results.small.serialization.fast && results.medium.serialization.fast) ? 
    ((results.small.serialization.native - results.small.serialization.fast) / results.small.serialization.native * 100 +
     (results.medium.serialization.native - results.medium.serialization.fast) / results.medium.serialization.native * 100) / 2 : null;
  
  const avgDeserImprovement = 
    ['small', 'medium', 'large'].reduce((sum, size) => {
      const deser = results[size].deserialization;
      return sum + ((deser.native - deser.simdjson) / deser.native * 100);
    }, 0) / 3;
  
  if (avgSerImprovement && avgSerImprovement > 10) {
    console.log('✅ 推荐使用 fast-json-stringify 进行序列化优化');
  } else {
    console.log('⚠️  fast-json-stringify 在当前测试环境下提升有限');
  }
  
  if (avgDeserImprovement > 10) {
    console.log('✅ 推荐使用 simdjson 进行反序列化优化');
  } else {
    console.log('⚠️  simdjson 在当前测试环境下提升有限，可能由于数据大小或结构原因');
  }
  
  console.log('\n🎯 总结:');
  console.log('• 性能提升很大程度上取决于数据结构和大小');
  console.log('• 小数据量时，库的初始化开销可能超过性能收益');
  console.log('• 建议在生产环境相似的数据上进行测试');
  console.log('• 考虑内存使用、维护成本等因素选择合适的库');
}

// 运行测试
if (require.main === module) {
  runEnhancedBenchmarks();
}

module.exports = { runEnhancedBenchmarks, generateTestData };
