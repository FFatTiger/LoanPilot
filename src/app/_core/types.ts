// 贷款类型
export type LoanType = 'commercial' | 'housing-fund' | 'combination';

// 还款方式
export type RepaymentMethod = 'equal-installment' | 'equal-principal';

// 提前还款策略
export type PrepaymentStrategy = 'reduce-term' | 'reduce-payment';

// 基础贷款参数
export interface LoanParams {
  loanType: LoanType;
  repaymentMethod: RepaymentMethod;
  // 当贷款类型为单一贷款时使用这些字段
  amount?: number; // 贷款金额（元）
  term?: number; // 贷款期限（月）
  interestRate?: number; // 年利率（小数形式，如0.045表示4.5%）
  // 当贷款类型为组合贷款时使用这些字段
  commercialPart?: {
    amount: number;
    term: number;
    interestRate: number;
  };
  housingFundPart?: {
    amount: number;
    term: number;
    interestRate: number;
  };
}

// 提前还款计划
export interface Prepayment {
  id: string;
  month: number; // 第几个月提前还款
  amount: number; // 提前还款金额
  strategy: PrepaymentStrategy; // 提前还款策略
  targetLoan?: 'commercial' | 'housing-fund'; // 组合贷款时指定目标贷款
}

// 单期还款详情
export interface PaymentDetail {
  period: number; // 期数
  payment: number; // 月供
  principal: number; // 本金
  interest: number; // 利息
  remainingPrincipal: number; // 剩余本金
  isPrepayment?: boolean; // 是否为提前还款期
  prepaymentAmount?: number; // 提前还款金额
}

// 单个贷款的计算结果
export interface LoanResults {
  monthlyPayment: number; // 月供
  totalPayment: number; // 总还款额
  totalInterest: number; // 总利息
  actualTerm: number; // 实际还款期限
  paymentSchedule: PaymentDetail[]; // 详细还款计划
}

// 组合贷款计算结果
export interface CombinationLoanResults {
  commercial: LoanResults;
  housingFund: LoanResults;
  combined: {
    monthlyPayment: number;
    totalPayment: number;
    totalInterest: number;
    actualTerm: number;
    paymentSchedule: PaymentDetail[]; // 合并后的还款计划
  };
}

// 计算结果
export interface CalculationResults {
  originalResults: LoanResults | CombinationLoanResults; // 原始还款计划结果
  optimizedResults: LoanResults | CombinationLoanResults; // 优化后还款计划结果
  savings: {
    totalInterest: number; // 节省利息
    totalPayment: number; // 节省总还款额
    termReduction: number; // 缩短期限（月）
  };
  // 组合贷款时的详细信息
  combinationDetails?: {
    commercial: {
      original: LoanResults;
      optimized: LoanResults;
      savings: {
        totalInterest: number;
        totalPayment: number;
        termReduction: number;
      };
    };
    housingFund: {
      original: LoanResults;
      optimized: LoanResults;
      savings: {
        totalInterest: number;
        totalPayment: number;
        termReduction: number;
      };
    };
  };
}

// 辅助类型：判断是否为组合贷款结果
export function isCombinationLoanResults(results: LoanResults | CombinationLoanResults): results is CombinationLoanResults {
  return 'commercial' in results && 'housingFund' in results;
} 