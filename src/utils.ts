/**
 * 安全相除，分母为 0 时返回 0
 */
export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * 百分比计算，默认保留 2 位小数
 * 返回值例如：0.1234 表示 12.34%
 */
export function percent(numerator: number, denominator: number, precision = 2): number {
  const ratio = safeDivide(numerator, denominator);
  return round(ratio, precision + 2);
}

/**
 * 指定小数位四舍五入
 */
export function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * 求和辅助
 */
export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
