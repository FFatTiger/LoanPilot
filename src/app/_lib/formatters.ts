/**
 * 格式化货币金额
 * @param amount 金额（元）
 * @param unit 显示单位 'yuan' | 'wan'
 * @param precision 小数位数
 * @returns 格式化后的字符串
 */
export function formatCurrency(
  amount: number, 
  unit?: 'yuan' | 'wan', 
  precision: number = 2
): string {
  const displayUnit = unit || 'yuan';
  if (displayUnit === 'wan') {
    const wanAmount = amount / 10000;
    return `${wanAmount.toLocaleString('zh-CN', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    })}万`;
  }
  
  return `¥${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  })}`;
}

/**
 * 格式化百分比
 * @param rate 利率（小数形式）
 * @param precision 小数位数
 * @returns 格式化后的百分比字符串
 */
export function formatPercentage(rate: number, precision: number = 2): string {
  return `${(rate * 100).toFixed(precision)}%`;
}

/**
 * 格式化期数
 * @param months 月数
 * @returns 格式化后的期数字符串
 */
export function formatTerm(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years === 0) {
    return `${months}个月`;
  } else if (remainingMonths === 0) {
    return `${years}年`;
  } else {
    return `${years}年${remainingMonths}个月`;
  }
}

/**
 * 格式化数字（带千分位分隔符）
 * @param num 数字
 * @param precision 小数位数
 * @returns 格式化后的数字字符串
 */
export function formatNumber(num: number, precision: number = 2): string {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });
}

/**
 * 解析输入的金额字符串
 * @param input 输入字符串
 * @param unit 当前单位
 * @returns 解析后的金额（元）
 */
export function parseAmount(input: string, unit: 'yuan' | 'wan' = 'yuan'): number {
  // 移除非数字字符（保留小数点）
  const cleanInput = input.replace(/[^\d.]/g, '');
  const amount = parseFloat(cleanInput) || 0;
  
  return unit === 'wan' ? amount * 10000 : amount;
}

/**
 * 解析输入的利率字符串
 * @param input 输入字符串
 * @returns 解析后的利率（小数形式）
 */
export function parseRate(input: string): number {
  const cleanInput = input.replace(/[^\d.]/g, '');
  const rate = parseFloat(cleanInput) || 0;
  
  // 智能判断：如果输入的数值大于等于0.1，认为是百分比形式；否则认为是已经转换好的小数形式
  if (rate >= 0.1) {
    // 百分比形式，如 4.5 -> 0.045, 0.5 -> 0.005
    return rate / 100;
  } else {
    // 小数形式，如 0.045 -> 0.045, 0.05 -> 0.05
    return rate;
  }
}

/**
 * 转换金额单位
 * @param amount 金额（元）
 * @param fromUnit 原单位
 * @param toUnit 目标单位
 * @returns 转换后的金额
 */
export function convertAmountUnit(
  amount: number,
  fromUnit: 'yuan' | 'wan',
  toUnit: 'yuan' | 'wan'
): number {
  if (fromUnit === toUnit) return amount;
  
  if (fromUnit === 'yuan' && toUnit === 'wan') {
    return amount / 10000;
  } else {
    return amount * 10000;
  }
}

/**
 * 格式化节省金额（带正负号和颜色提示）
 * @param savings 节省金额
 * @param unit 显示单位
 * @returns 格式化信息
 */
export function formatSavings(savings: number, unit: 'yuan' | 'wan' = 'yuan') {
  const isPositive = savings > 0;
  const absAmount = Math.abs(savings);
  const formattedAmount = formatCurrency(absAmount, unit);
  
  return {
    text: `${isPositive ? '+' : '-'}${formattedAmount}`,
    isPositive,
    className: isPositive ? 'text-green-600' : 'text-red-600'
  };
}

/**
 * 生成动画数值（用于数字滚动动画）
 * @param from 起始值
 * @param to 结束值
 * @param progress 进度 (0-1)
 * @returns 当前动画值
 */
export function animateNumber(from: number, to: number, progress: number): number {
  // 使用缓动函数
  const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
  const easedProgress = easeOutCubic(progress);
  
  return from + (to - from) * easedProgress;
}

/**
 * 验证输入值范围
 */
export const validators = {
  loanAmount: (amount: number): { isValid: boolean; message?: string } => {
    if (amount <= 0) {
      return { isValid: false, message: '贷款金额必须大于0' };
    }
    if (amount > 100000000) { // 1亿
      return { isValid: false, message: '贷款金额不能超过1亿元' };
    }
    return { isValid: true };
  },

  loanTerm: (term: number): { isValid: boolean; message?: string } => {
    if (term <= 0) {
      return { isValid: false, message: '贷款期限必须大于0' };
    }
    if (term > 600) { // 50年
      return { isValid: false, message: '贷款期限不能超过50年' };
    }
    return { isValid: true };
  },

  interestRate: (rate: number): { isValid: boolean; message?: string } => {
    if (rate <= 0) {
      return { isValid: false, message: '利率必须大于0' };
    }
    if (rate > 0.5) { // 50%
      return { isValid: false, message: '利率不能超过50%' };
    }
    return { isValid: true };
  },

  prepaymentAmount: (amount: number, maxAmount: number): { isValid: boolean; message?: string } => {
    if (amount <= 0) {
      return { isValid: false, message: '提前还款金额必须大于0' };
    }
    if (amount > maxAmount) {
      return { isValid: false, message: '提前还款金额不能超过剩余本金' };
    }
    return { isValid: true };
  }
}; 