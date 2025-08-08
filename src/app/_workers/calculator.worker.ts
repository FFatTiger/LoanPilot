import { LoanCalculator } from '../_core/calculator';
import { LoanParams, Prepayment, CalculationResults } from '../_core/types';

// 定义消息类型
interface CalculationMessage {
  type: 'CALCULATE';
  payload: {
    params: LoanParams;
    prepayments: Prepayment[];
  };
}

interface CalculationResponse {
  type: 'CALCULATION_COMPLETE';
  payload: CalculationResults;
}

interface ErrorResponse {
  type: 'CALCULATION_ERROR';
  payload: {
    error: string;
  };
}

// 监听主线程消息
self.addEventListener('message', (event: MessageEvent<CalculationMessage>) => {
  const { type, payload } = event.data;

  try {
    if (type === 'CALCULATE') {
      const { params, prepayments } = payload;
      
      // 验证参数完整性
      if (params.loanType === 'combination') {
        if (!params.commercialPart || !params.housingFundPart) {
          throw new Error('组合贷款参数不完整：缺少商业贷款或公积金贷款部分');
        }
        
        // 验证组合贷款的具体参数
        if (!params.commercialPart.amount || params.commercialPart.amount <= 0 ||
            !params.commercialPart.term || params.commercialPart.term <= 0 ||
            !params.commercialPart.interestRate || params.commercialPart.interestRate <= 0) {
          throw new Error('商业贷款参数不完整或无效');
        }
        
        if (!params.housingFundPart.amount || params.housingFundPart.amount <= 0 ||
            !params.housingFundPart.term || params.housingFundPart.term <= 0 ||
            !params.housingFundPart.interestRate || params.housingFundPart.interestRate <= 0) {
          throw new Error('公积金贷款参数不完整或无效');
        }
        
        // 验证组合贷款的提前还款计划
        for (const prepayment of prepayments) {
          if (!prepayment.targetLoan) {
            throw new Error('组合贷款的提前还款计划必须指定目标贷款');
          }
          if (prepayment.targetLoan !== 'commercial' && prepayment.targetLoan !== 'housing-fund') {
            throw new Error('无效的提前还款目标贷款类型');
          }
        }
      } else {
        // 单一贷款参数验证
        if (!params.amount || params.amount <= 0 ||
            !params.term || params.term <= 0 ||
            !params.interestRate || params.interestRate <= 0) {
          throw new Error('单一贷款参数不完整或无效');
        }
        
        // 验证单一贷款的提前还款计划不应该有目标贷款
        for (const prepayment of prepayments) {
          if (prepayment.targetLoan) {
            throw new Error('单一贷款的提前还款计划不应该指定目标贷款');
          }
        }
      }
      
      // 执行计算
      const results = LoanCalculator.calculate(params, prepayments);
      
      // 发送结果回主线程
      const response: CalculationResponse = {
        type: 'CALCULATION_COMPLETE',
        payload: results
      };
      
      self.postMessage(response);
    }
  } catch (error) {
    // 发送错误信息回主线程
    const errorResponse: ErrorResponse = {
      type: 'CALCULATION_ERROR',
      payload: {
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
    
    self.postMessage(errorResponse);
  }
});

// 导出类型以供主线程使用
export type { CalculationMessage, CalculationResponse, ErrorResponse }; 