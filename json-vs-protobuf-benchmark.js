const protobuf = require('protobufjs');
const fs = require('fs');
const path = require('path');

// 加载 Protobuf 定义
let protoRoot = null;
let SimpleData, UserList, ProductCatalog;

async function loadProtoDefinitions() {
  try {
    protoRoot = await protobuf.load(path.join(__dirname, 'test-data.proto'));
    SimpleData = protoRoot.lookupType('testdata.SimpleData');
    UserList = protoRoot.lookupType('testdata.UserList');
    ProductCatalog = protoRoot.lookupType('testdata.ProductCatalog');
    console.log('✅ Protobuf 定义加载成功');
  } catch (error) {
    console.error('❌ 加载 Protobuf 定义失败:', error.message);
    process.exit(1);
  }
}

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
        weight: parseFloat((Math.random() * 10).toFixed(2)),
        dimensions: {
          length: parseFloat((Math.random() * 100).toFixed(1)),
          width: parseFloat((Math.random() * 100).toFixed(1)),
          height: parseFloat((Math.random() * 100).toFixed(1))
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

// 基准测试函数
function benchmark(name, iterations, testFunction, displayDetail = true) {
  if (displayDetail) {
    console.log(`\n🧪 ${name}`);
    console.log('━'.repeat(50));
  }
  
  // 预热
  for (let i = 0; i < 10; i++) {
    testFunction();
  }
  
  // 内存使用情况记录
  const memBefore = process.memoryUsage();
  const start = process.hrtime.bigint();
  
  for (let i = 0; i < iterations; i++) {
    testFunction();
  }
  
  const end = process.hrtime.bigint();
  const memAfter = process.memoryUsage();
  const duration = Number(end - start) / 1000000; // 转换为毫秒
  
  if (displayDetail) {
    console.log(`执行次数: ${iterations.toLocaleString()}`);
    console.log(`总时间: ${duration.toFixed(2)} ms`);
    console.log(`平均时间: ${(duration / iterations).toFixed(6)} ms`);
    console.log(`每秒操作数: ${(iterations / (duration / 1000)).toFixed(0)} ops/sec`);
    console.log(`内存变化: ${((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
  }
  
  return {
    duration,
    avgTime: duration / iterations,
    opsPerSec: iterations / (duration / 1000),
    memoryDelta: (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024
  };
}

// 序列化测试
function testSerialization(data, protoType, dataSize, iterations) {
  console.log(`\n📦 序列化测试 - ${dataSize} 数据`);
  console.log('='.repeat(60));
  
  let jsonResult, protobufResult;
  
  // JSON 序列化
  jsonResult = benchmark(
    'JSON.stringify',
    iterations,
    () => JSON.stringify(data)
  );
  
  // Protobuf 序列化
  protobufResult = benchmark(
    'Protobuf.encode',
    iterations,
    () => {
      const message = protoType.create(data);
      return protoType.encode(message).finish();
    }
  );
  
  // 计算性能对比
  const timeImprovement = ((jsonResult.avgTime - protobufResult.avgTime) / jsonResult.avgTime * 100);
  const opsImprovement = ((protobufResult.opsPerSec - jsonResult.opsPerSec) / jsonResult.opsPerSec * 100);
  
  console.log(`\n📊 序列化性能对比:`);
  console.log(`Protobuf 比 JSON ${timeImprovement > 0 ? '快' : '慢'} ${Math.abs(timeImprovement).toFixed(1)}%`);
  console.log(`Protobuf 吞吐量 ${opsImprovement > 0 ? '高' : '低'} ${Math.abs(opsImprovement).toFixed(1)}%`);
  
  return { json: jsonResult, protobuf: protobufResult };
}

// 反序列化测试
function testDeserialization(jsonString, protobufBuffer, protoType, dataSize, iterations) {
  console.log(`\n📖 反序列化测试 - ${dataSize} 数据`);
  console.log('='.repeat(60));
  
  let jsonResult, protobufResult;
  
  // JSON 反序列化
  jsonResult = benchmark(
    'JSON.parse',
    iterations,
    () => JSON.parse(jsonString)
  );
  
  // Protobuf 反序列化
  protobufResult = benchmark(
    'Protobuf.decode',
    iterations,
    () => protoType.decode(protobufBuffer)
  );
  
  // 计算性能对比
  const timeImprovement = ((jsonResult.avgTime - protobufResult.avgTime) / jsonResult.avgTime * 100);
  const opsImprovement = ((protobufResult.opsPerSec - jsonResult.opsPerSec) / jsonResult.opsPerSec * 100);
  
  console.log(`\n📊 反序列化性能对比:`);
  console.log(`Protobuf 比 JSON ${timeImprovement > 0 ? '快' : '慢'} ${Math.abs(timeImprovement).toFixed(1)}%`);
  console.log(`Protobuf 吞吐量 ${opsImprovement > 0 ? '高' : '低'} ${Math.abs(opsImprovement).toFixed(1)}%`);
  
  return { json: jsonResult, protobuf: protobufResult };
}

// 数据大小对比
function compareDataSizes(data, protoType, dataSize) {
  console.log(`\n📏 数据大小对比 - ${dataSize} 数据`);
  console.log('='.repeat(60));
  
  // JSON 大小
  const jsonString = JSON.stringify(data);
  const jsonSize = Buffer.byteLength(jsonString, 'utf8');
  
  // Protobuf 大小
  const message = protoType.create(data);
  const protobufBuffer = protoType.encode(message).finish();
  const protobufSize = protobufBuffer.length;
  
  // 计算压缩比
  const compressionRatio = ((jsonSize - protobufSize) / jsonSize * 100);
  
  console.log(`JSON 大小: ${(jsonSize / 1024).toFixed(2)} KB`);
  console.log(`Protobuf 大小: ${(protobufSize / 1024).toFixed(2)} KB`);
  console.log(`压缩比: ${compressionRatio.toFixed(1)}% (Protobuf 比 JSON 小)`);
  
  return {
    json: jsonSize,
    protobuf: protobufSize,
    compressionRatio: compressionRatio
  };
}

// 运行完整的性能对比测试
async function runFullBenchmark() {
  console.log('🚀 JSON vs Protobuf 性能基准测试');
  console.log('='.repeat(80));
  console.log(`Node.js 版本: ${process.version}`);
  console.log(`平台: ${process.platform} ${process.arch}`);
  console.log(`CPU: ${require('os').cpus()[0].model}`);
  console.log(`内存: ${(require('os').totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`);
  
  await loadProtoDefinitions();
  
  const { smallData, mediumData, largeData } = generateTestData();
  
  const testCases = [
    { data: smallData, proto: SimpleData, name: 'Small', iterations: 50000 },
    { data: mediumData, proto: UserList, name: 'Medium', iterations: 1000 },
    { data: largeData, proto: ProductCatalog, name: 'Large', iterations: 100 }
  ];
  
  const results = {};
  
  for (const testCase of testCases) {
    const { data, proto, name, iterations } = testCase;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔬 ${name.toUpperCase()} 数据测试`);
    console.log(`${'='.repeat(80)}`);
    
    // 数据大小对比
    const sizeComparison = compareDataSizes(data, proto, name);
    
    // 序列化测试
    const serializationResults = testSerialization(data, proto, name, iterations);
    
    // 准备反序列化测试数据
    const jsonString = JSON.stringify(data);
    const message = proto.create(data);
    const protobufBuffer = proto.encode(message).finish();
    
    // 反序列化测试
    const deserializationResults = testDeserialization(jsonString, protobufBuffer, proto, name, iterations);
    
    results[name.toLowerCase()] = {
      size: sizeComparison,
      serialization: serializationResults,
      deserialization: deserializationResults,
      iterations: iterations
    };
  }
  
  // 生成总结报告
  generateSummaryReport(results);
  
  // 保存详细结果
  const reportData = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: `${process.platform} ${process.arch}`,
    cpu: require('os').cpus()[0].model,
    memory: `${(require('os').totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`,
    results: results
  };
  
  const filename = `json-protobuf-benchmark-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(reportData, null, 2));
  console.log(`\n💾 详细测试结果已保存到: ${filename}`);
  
  return results;
}

// 生成总结报告
function generateSummaryReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 总结报告');
  console.log('='.repeat(80));
  
  const sizes = ['small', 'medium', 'large'];
  
  // 数据压缩效果
  console.log('\n📏 数据压缩效果:');
  console.log('─'.repeat(50));
  sizes.forEach(size => {
    const result = results[size];
    console.log(`${size.toUpperCase()}: Protobuf 比 JSON 小 ${result.size.compressionRatio.toFixed(1)}%`);
  });
  
  // 序列化性能
  console.log('\n📦 序列化性能 (Protobuf vs JSON):');
  console.log('─'.repeat(50));
  sizes.forEach(size => {
    const result = results[size];
    const improvement = ((result.serialization.json.avgTime - result.serialization.protobuf.avgTime) / result.serialization.json.avgTime * 100);
    console.log(`${size.toUpperCase()}: ${improvement > 0 ? '快' : '慢'} ${Math.abs(improvement).toFixed(1)}%`);
  });
  
  // 反序列化性能
  console.log('\n📖 反序列化性能 (Protobuf vs JSON):');
  console.log('─'.repeat(50));
  sizes.forEach(size => {
    const result = results[size];
    const improvement = ((result.deserialization.json.avgTime - result.deserialization.protobuf.avgTime) / result.deserialization.json.avgTime * 100);
    console.log(`${size.toUpperCase()}: ${improvement > 0 ? '快' : '慢'} ${Math.abs(improvement).toFixed(1)}%`);
  });
  
  console.log('\n💡 结论和建议:');
  console.log('─'.repeat(50));
  console.log('• 🗜️  数据压缩: Protobuf 通常能显著减少数据大小');
  console.log('• ⚡ 序列化: Protobuf 在大数据量时性能优势明显');
  console.log('• 🔄 反序列化: Protobuf 通常比 JSON 更快');
  console.log('• 🎯 推荐场景: 高频数据传输、存储敏感、性能要求高的应用');
  console.log('• ⚠️  注意事项: 需要维护 .proto 文件，开发复杂度略高');
}

// 运行测试
if (require.main === module) {
  runFullBenchmark().catch(console.error);
}

module.exports = { runFullBenchmark, loadProtoDefinitions };
