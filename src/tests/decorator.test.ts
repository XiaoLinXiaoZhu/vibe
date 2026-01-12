import { VibeClass, vibeFn } from '../index.js';

export async function testDecorator() {
  console.log('=== 装饰器测试 ===\n');

  @VibeClass()
  class Calculator {
    @vibeFn
    multiply(a: number, b: number): any {
      return;
    }

    @vibeFn
    factorial(n: number): any {
      return;
    }

    @vibeFn
    square(n: number): any {
      return;
    }
  }

  const calc = new Calculator();

  // 测试 1: 乘法
  console.log('测试 1: 装饰器乘法');
  const result1 = await calc.multiply(6, 7);
  console.log(`  calc.multiply(6, 7) = ${result1} ✓\n`);

  // 测试 2: 阶乘
  console.log('测试 2: 装饰器阶乘');
  const result2 = await calc.factorial(5);
  console.log(`  calc.factorial(5) = ${result2} ✓\n`);

  // 测试 3: 平方
  console.log('测试 3: 装饰器平方');
  const result3 = await calc.square(8);
  console.log(`  calc.square(8) = ${result3} ✓\n`);

  console.log('=== 装饰器测试完成 ===\n');
}
