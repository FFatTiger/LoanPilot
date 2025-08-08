import { 
  LoanParams, 
  PaymentDetail, 
  LoanResults, 
  CombinationLoanResults,
  Prepayment, 
  RepaymentMethod,
  CalculationResults,
  isCombinationLoanResults
} from './types';

/**
 * 核心计算引擎类
 */
export class LoanCalculator {
  /**
   * 计算等额本息月供
   * 公式: 月供 = 贷款本金 × [月利率 × (1 + 月利率)^还款月数] / [(1 + 月利率)^还款月数 - 1]
   */
  static calculateEqualInstallmentPayment(
    principal: number,
    monthlyRate: number,
    term: number
  ): number {
    if (monthlyRate === 0) {
      return principal / term;
    }
    
    const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, term);
    const denominator = Math.pow(1 + monthlyRate, term) - 1;
    return numerator / denominator;
  }

  /**
   * 计算等额本金第t期月供
   * 公式: 每月还款金额 = (贷款本金 / 还款月数) + (贷款本金 - 已偿还本金累计额) × 每月利率
   */
  static calculateEqualPrincipalPayment(
    originalPrincipal: number,
    remainingPrincipal: number,
    monthlyRate: number,
    term: number
  ): { payment: number; principal: number; interest: number } {
    const monthlyPrincipal = originalPrincipal / term;
    const monthlyInterest = remainingPrincipal * monthlyRate;
    const payment = monthlyPrincipal + monthlyInterest;
    
    return {
      payment,
      principal: monthlyPrincipal,
      interest: monthlyInterest
    };
  }

  /**
   * 反解等额本息剩余期限
   * 用于"缩短期限"策略的提前还款计算
   * 公式: 剩余贷款期限 = ln[月还款额 / (月还款额 - 新本金 × 月利率)] / ln(1 + 月利率)
   */
  static calculateRemainingTerm(
    remainingPrincipal: number,
    monthlyPayment: number,
    monthlyRate: number
  ): number {
    if (monthlyRate === 0) {
      return remainingPrincipal / monthlyPayment;
    }

    const numerator = Math.log(monthlyPayment / (monthlyPayment - remainingPrincipal * monthlyRate));
    const denominator = Math.log(1 + monthlyRate);
    return numerator / denominator;
  }

  /**
   * 生成单个贷款的原始还款计划（无提前还款）
   */
  static generateSingleLoanSchedule(
    amount: number,
    term: number,
    interestRate: number,
    repaymentMethod: RepaymentMethod
  ): LoanResults {
    const monthlyRate = interestRate / 12;
    const schedule: PaymentDetail[] = [];
    
    let remainingPrincipal = amount;
    let totalPayment = 0;
    let totalInterest = 0;

    if (repaymentMethod === 'equal-installment') {
      // 等额本息
      const monthlyPayment = this.calculateEqualInstallmentPayment(amount, monthlyRate, term);
      
      for (let period = 1; period <= term; period++) {
        const interest = remainingPrincipal * monthlyRate;
        const principal = monthlyPayment - interest;
        remainingPrincipal -= principal;
        
        // 处理最后一期的精度问题
        if (period === term) {
          remainingPrincipal = Math.max(0, remainingPrincipal);
        }
        
        schedule.push({
          period,
          payment: monthlyPayment,
          principal,
          interest,
          remainingPrincipal: Math.max(0, remainingPrincipal)
        });
        
        totalPayment += monthlyPayment;
        totalInterest += interest;
      }
      
      return {
        monthlyPayment: this.calculateEqualInstallmentPayment(amount, monthlyRate, term),
        totalPayment,
        totalInterest,
        actualTerm: term,
        paymentSchedule: schedule
      };
    } else {
      // 等额本金
      for (let period = 1; period <= term; period++) {
        const { payment, principal, interest } = this.calculateEqualPrincipalPayment(
          amount, remainingPrincipal, monthlyRate, term
        );
        
        remainingPrincipal -= principal;
        
        schedule.push({
          period,
          payment,
          principal,
          interest,
          remainingPrincipal: Math.max(0, remainingPrincipal)
        });
        
        totalPayment += payment;
        totalInterest += interest;
      }
      
      return {
        monthlyPayment: schedule[0].payment, // 首期月供
        totalPayment,
        totalInterest,
        actualTerm: term,
        paymentSchedule: schedule
      };
    }
  }

  /**
   * 生成原始还款计划（无提前还款）
   */
  static generateOriginalSchedule(params: LoanParams): LoanResults | CombinationLoanResults {
    if (params.loanType === 'combination') {
      // 组合贷款
      if (!params.commercialPart || !params.housingFundPart) {
        throw new Error('组合贷款参数不完整');
      }

      const commercial = this.generateSingleLoanSchedule(
        params.commercialPart.amount,
        params.commercialPart.term,
        params.commercialPart.interestRate,
        params.repaymentMethod
      );

      const housingFund = this.generateSingleLoanSchedule(
        params.housingFundPart.amount,
        params.housingFundPart.term,
        params.housingFundPart.interestRate,
        params.repaymentMethod
      );

      // 合并还款计划
      const maxTerm = Math.max(commercial.actualTerm, housingFund.actualTerm);
      const combinedSchedule: PaymentDetail[] = [];

      for (let period = 1; period <= maxTerm; period++) {
        const commercialDetail = commercial.paymentSchedule[period - 1];
        const housingFundDetail = housingFund.paymentSchedule[period - 1];

        combinedSchedule.push({
          period,
          payment: (commercialDetail?.payment || 0) + (housingFundDetail?.payment || 0),
          principal: (commercialDetail?.principal || 0) + (housingFundDetail?.principal || 0),
          interest: (commercialDetail?.interest || 0) + (housingFundDetail?.interest || 0),
          remainingPrincipal: (commercialDetail?.remainingPrincipal || 0) + (housingFundDetail?.remainingPrincipal || 0)
        });
      }

      return {
        commercial,
        housingFund,
        combined: {
          monthlyPayment: commercial.monthlyPayment + housingFund.monthlyPayment,
          totalPayment: commercial.totalPayment + housingFund.totalPayment,
          totalInterest: commercial.totalInterest + housingFund.totalInterest,
          actualTerm: maxTerm,
          paymentSchedule: combinedSchedule
        }
      };
    } else {
      // 单一贷款
      if (!params.amount || !params.term || !params.interestRate) {
        throw new Error('单一贷款参数不完整');
      }

      return this.generateSingleLoanSchedule(
        params.amount,
        params.term,
        params.interestRate,
        params.repaymentMethod
      );
    }
  }

  /**
   * 应用提前还款到单个贷款
   */
  static applySingleLoanPrepayments(
    amount: number,
    term: number,
    interestRate: number,
    repaymentMethod: RepaymentMethod,
    prepayments: Prepayment[]
  ): LoanResults {
    if (prepayments.length === 0) {
      return this.generateSingleLoanSchedule(amount, term, interestRate, repaymentMethod);
    }

    const monthlyRate = interestRate / 12;
    const schedule: PaymentDetail[] = [];
    
    // 按月份排序提前还款计划
    const sortedPrepayments = [...prepayments].sort((a, b) => a.month - b.month);
    
    let remainingPrincipal = amount;
    let currentTerm = term;
    let totalPayment = 0;
    let totalInterest = 0;
    let period = 1;
    let prepaymentIndex = 0;
    let currentMonthlyPayment = this.calculateEqualInstallmentPayment(amount, monthlyRate, term);

    while (remainingPrincipal > 0.01 && period <= 600) { // 最大500年防止无限循环
      const currentPrepayment = sortedPrepayments[prepaymentIndex];
      const isPrepaymentMonth = currentPrepayment && currentPrepayment.month === period;
      
      let payment: number;
      let principal: number;
      let interest: number;

      if (repaymentMethod === 'equal-installment') {
        // 等额本息
        interest = remainingPrincipal * monthlyRate;
        principal = Math.min(currentMonthlyPayment - interest, remainingPrincipal);
        payment = principal + interest;
      } else {
        // 等额本金
        const monthlyPrincipal = amount / term;
        interest = remainingPrincipal * monthlyRate;
        principal = Math.min(monthlyPrincipal, remainingPrincipal);
        payment = principal + interest;
      }

      remainingPrincipal -= principal;
      totalPayment += payment;
      totalInterest += interest;

      schedule.push({
        period,
        payment,
        principal,
        interest,
        remainingPrincipal: Math.max(0, remainingPrincipal),
        isPrepayment: isPrepaymentMonth,
        prepaymentAmount: isPrepaymentMonth ? currentPrepayment.amount : undefined
      });

      // 处理提前还款
      if (isPrepaymentMonth && currentPrepayment) {
        const prepaymentAmount = Math.min(currentPrepayment.amount, remainingPrincipal);
        remainingPrincipal -= prepaymentAmount;
        totalPayment += prepaymentAmount;

        // 更新还款计划表中的提前还款信息
        schedule[schedule.length - 1].prepaymentAmount = prepaymentAmount;
        schedule[schedule.length - 1].remainingPrincipal = Math.max(0, remainingPrincipal);

        if (remainingPrincipal <= 0.01) {
          break;
        }

        // 重新计算后续还款计划
        if (currentPrepayment.strategy === 'reduce-payment') {
          // 减少月供策略：期限不变，重新计算月供
          const remainingTerm = term - period;
          if (remainingTerm > 0) {
            currentMonthlyPayment = this.calculateEqualInstallmentPayment(
              remainingPrincipal, monthlyRate, remainingTerm
            );
          }
        } else {
          // 缩短期限策略：月供不变，重新计算期限
          if (repaymentMethod === 'equal-installment') {
            const newTerm = this.calculateRemainingTerm(
              remainingPrincipal, currentMonthlyPayment, monthlyRate
            );
            currentTerm = period + Math.ceil(newTerm);
          }
        }

        prepaymentIndex++;
      }

      period++;
    }

    // 处理剩余本金（精度问题）
    if (remainingPrincipal > 0.01) {
      schedule.push({
        period,
        payment: remainingPrincipal,
        principal: remainingPrincipal,
        interest: 0,
        remainingPrincipal: 0
      });
      totalPayment += remainingPrincipal;
    }

    return {
      monthlyPayment: this.calculateEqualInstallmentPayment(amount, monthlyRate, term),
      totalPayment,
      totalInterest,
      actualTerm: schedule.length,
      paymentSchedule: schedule
    };
  }

  /**
   * 应用提前还款计划，生成优化后的还款计划
   */
  static generateOptimizedSchedule(
    params: LoanParams, 
    prepayments: Prepayment[]
  ): LoanResults | CombinationLoanResults {
    if (prepayments.length === 0) {
      return this.generateOriginalSchedule(params);
    }

    if (params.loanType === 'combination') {
      // 组合贷款
      if (!params.commercialPart || !params.housingFundPart) {
        throw new Error('组合贷款参数不完整');
      }

      // 分别处理商业贷款和公积金贷款的提前还款
      const commercialPrepayments = prepayments.filter(p => p.targetLoan === 'commercial');
      const housingFundPrepayments = prepayments.filter(p => p.targetLoan === 'housing-fund');

      const commercial = this.applySingleLoanPrepayments(
        params.commercialPart.amount,
        params.commercialPart.term,
        params.commercialPart.interestRate,
        params.repaymentMethod,
        commercialPrepayments
      );

      const housingFund = this.applySingleLoanPrepayments(
        params.housingFundPart.amount,
        params.housingFundPart.term,
        params.housingFundPart.interestRate,
        params.repaymentMethod,
        housingFundPrepayments
      );

      // 合并还款计划
      const maxTerm = Math.max(commercial.actualTerm, housingFund.actualTerm);
      const combinedSchedule: PaymentDetail[] = [];

      for (let period = 1; period <= maxTerm; period++) {
        const commercialDetail = commercial.paymentSchedule[period - 1];
        const housingFundDetail = housingFund.paymentSchedule[period - 1];

        combinedSchedule.push({
          period,
          payment: (commercialDetail?.payment || 0) + (housingFundDetail?.payment || 0),
          principal: (commercialDetail?.principal || 0) + (housingFundDetail?.principal || 0),
          interest: (commercialDetail?.interest || 0) + (housingFundDetail?.interest || 0),
          remainingPrincipal: (commercialDetail?.remainingPrincipal || 0) + (housingFundDetail?.remainingPrincipal || 0),
          isPrepayment: (commercialDetail?.isPrepayment || housingFundDetail?.isPrepayment),
          prepaymentAmount: (commercialDetail?.prepaymentAmount || 0) + (housingFundDetail?.prepaymentAmount || 0)
        });
      }

      return {
        commercial,
        housingFund,
        combined: {
          monthlyPayment: commercial.monthlyPayment + housingFund.monthlyPayment,
          totalPayment: commercial.totalPayment + housingFund.totalPayment,
          totalInterest: commercial.totalInterest + housingFund.totalInterest,
          actualTerm: maxTerm,
          paymentSchedule: combinedSchedule
        }
      };
    } else {
      // 单一贷款
      if (!params.amount || !params.term || !params.interestRate) {
        throw new Error('单一贷款参数不完整');
      }

      return this.applySingleLoanPrepayments(
        params.amount,
        params.term,
        params.interestRate,
        params.repaymentMethod,
        prepayments
      );
    }
  }

  /**
   * 主计算函数：生成完整的计算结果
   */
  static calculate(params: LoanParams, prepayments: Prepayment[] = []): CalculationResults {
    const originalResults = this.generateOriginalSchedule(params);
    const optimizedResults = this.generateOptimizedSchedule(params, prepayments);

    if (isCombinationLoanResults(originalResults) && isCombinationLoanResults(optimizedResults)) {
      // 组合贷款
      const combinedSavings = {
        totalInterest: originalResults.combined.totalInterest - optimizedResults.combined.totalInterest,
        totalPayment: originalResults.combined.totalPayment - optimizedResults.combined.totalPayment,
        termReduction: originalResults.combined.actualTerm - optimizedResults.combined.actualTerm
      };

      const commercialSavings = {
        totalInterest: originalResults.commercial.totalInterest - optimizedResults.commercial.totalInterest,
        totalPayment: originalResults.commercial.totalPayment - optimizedResults.commercial.totalPayment,
        termReduction: originalResults.commercial.actualTerm - optimizedResults.commercial.actualTerm
      };

      const housingFundSavings = {
        totalInterest: originalResults.housingFund.totalInterest - optimizedResults.housingFund.totalInterest,
        totalPayment: originalResults.housingFund.totalPayment - optimizedResults.housingFund.totalPayment,
        termReduction: originalResults.housingFund.actualTerm - optimizedResults.housingFund.actualTerm
      };

      return {
        originalResults,
        optimizedResults,
        savings: combinedSavings,
        combinationDetails: {
          commercial: {
            original: originalResults.commercial,
            optimized: optimizedResults.commercial,
            savings: commercialSavings
          },
          housingFund: {
            original: originalResults.housingFund,
            optimized: optimizedResults.housingFund,
            savings: housingFundSavings
          }
        }
      };
    } else {
      // 单一贷款
      const singleOriginal = originalResults as LoanResults;
      const singleOptimized = optimizedResults as LoanResults;

      const savings = {
        totalInterest: singleOriginal.totalInterest - singleOptimized.totalInterest,
        totalPayment: singleOriginal.totalPayment - singleOptimized.totalPayment,
        termReduction: singleOriginal.actualTerm - singleOptimized.actualTerm
      };

      return {
        originalResults,
        optimizedResults,
        savings
      };
    }
  }
} 