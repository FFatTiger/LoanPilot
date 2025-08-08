import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { LoanParams, Prepayment, CalculationResults, LoanType, RepaymentMethod } from '../_core/types';

// Worker相关类型
interface WorkerManager {
  worker: Worker | null;
  isCalculating: boolean;
}

// 状态接口
interface LoanState {
  // 贷款参数
  loanParams: LoanParams;
  
  // 提前还款计划
  prepaymentPlan: Prepayment[];
  
  // 计算结果
  results: CalculationResults | null;
  
  // UI状态
  isCalculating: boolean;
  calculationError: string | null;
  
  // Worker管理
  workerManager: WorkerManager;
  
  // Actions - 基础设置
  setLoanType: (type: LoanType) => void;
  setRepaymentMethod: (method: RepaymentMethod) => void;
  
  // Actions - 单一贷款设置
  setLoanAmount: (amount: number) => void;
  setLoanTerm: (term: number) => void;
  setInterestRate: (rate: number) => void;
  
  // Actions - 组合贷款设置
  setCommercialAmount: (amount: number) => void;
  setCommercialTerm: (term: number) => void;
  setCommercialRate: (rate: number) => void;
  setHousingFundAmount: (amount: number) => void;
  setHousingFundTerm: (term: number) => void;
  setHousingFundRate: (rate: number) => void;
  
  // Actions - 提前还款管理
  addPrepayment: (prepayment: Prepayment) => void;
  updatePrepayment: (id: string, updates: Partial<Prepayment>) => void;
  removePrepayment: (id: string) => void;
  clearPrepayments: () => void;
  
  // Actions - 计算和Worker管理
  calculate: () => Promise<void>;
  initWorker: () => void;
  terminateWorker: () => void;
  
  reset: () => void;
}

// 默认贷款参数
const defaultLoanParams: LoanParams = {
  loanType: 'commercial',
  repaymentMethod: 'equal-installment',
  amount: 1000000, // 100万元
  term: 360, // 30年
  interestRate: 0.045 // 4.5%
};

// 创建Worker实例
const createWorker = (): Worker => {
  return new Worker(
    new URL('../_workers/calculator.worker.ts', import.meta.url),
    { type: 'module' }
  );
};

export const useLoanStore = create<LoanState>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    loanParams: defaultLoanParams,
    prepaymentPlan: [],
    results: null,
    isCalculating: false,
    calculationError: null,
    workerManager: {
      worker: null,
      isCalculating: false
    },

    // 基础设置
    setLoanType: (type) =>
      set((state) => {
        let newParams: LoanParams;
        
        if (type === 'combination') {
          // 切换到组合贷款时，初始化组合贷款参数
          newParams = {
            loanType: type,
            repaymentMethod: state.loanParams.repaymentMethod,
            commercialPart: {
              amount: state.loanParams.amount || 600000, // 默认60万商业贷款
              term: state.loanParams.term || 360,
              interestRate: state.loanParams.interestRate || 0.045
            },
            housingFundPart: {
              amount: 400000, // 默认40万公积金贷款
              term: state.loanParams.term || 360,
              interestRate: 0.032 // 默认3.2%公积金利率
            }
          };
        } else {
          // 切换到单一贷款时，使用组合贷款的总额或默认值
          const totalAmount = state.loanParams.commercialPart && state.loanParams.housingFundPart
            ? state.loanParams.commercialPart.amount + state.loanParams.housingFundPart.amount
            : state.loanParams.amount || 1000000;
          
          newParams = {
            loanType: type,
            repaymentMethod: state.loanParams.repaymentMethod,
            amount: totalAmount,
            term: state.loanParams.commercialPart?.term || state.loanParams.term || 360,
            interestRate: type === 'commercial' 
              ? state.loanParams.commercialPart?.interestRate || state.loanParams.interestRate || 0.045
              : 0.032 // 公积金默认利率
          };
        }

        return {
          loanParams: newParams,
          results: null,
          // 清空不适用的提前还款计划
          prepaymentPlan: state.prepaymentPlan.filter(p => {
            if (type === 'combination') {
              return p.targetLoan !== undefined;
            } else {
              return p.targetLoan === undefined;
            }
          })
        };
      }),

    setRepaymentMethod: (method) =>
      set((state) => ({
        loanParams: { ...state.loanParams, repaymentMethod: method },
        results: null
      })),

    // 单一贷款设置
    setLoanAmount: (amount) =>
      set((state) => ({
        loanParams: { ...state.loanParams, amount },
        results: null
      })),

    setLoanTerm: (term) =>
      set((state) => ({
        loanParams: { ...state.loanParams, term },
        results: null
      })),

    setInterestRate: (rate) =>
      set((state) => ({
        loanParams: { ...state.loanParams, interestRate: rate },
        results: null
      })),

    // 组合贷款设置 - 商业贷款部分
    setCommercialAmount: (amount) =>
      set((state) => ({
        loanParams: {
          ...state.loanParams,
          commercialPart: state.loanParams.commercialPart
            ? { ...state.loanParams.commercialPart, amount }
            : { amount, term: 360, interestRate: 0.045 }
        },
        results: null
      })),

    setCommercialTerm: (term) =>
      set((state) => ({
        loanParams: {
          ...state.loanParams,
          commercialPart: state.loanParams.commercialPart
            ? { ...state.loanParams.commercialPart, term }
            : { amount: 600000, term, interestRate: 0.045 }
        },
        results: null
      })),

    setCommercialRate: (rate) =>
      set((state) => ({
        loanParams: {
          ...state.loanParams,
          commercialPart: state.loanParams.commercialPart
            ? { ...state.loanParams.commercialPart, interestRate: rate }
            : { amount: 600000, term: 360, interestRate: rate }
        },
        results: null
      })),

    // 组合贷款设置 - 公积金贷款部分
    setHousingFundAmount: (amount) =>
      set((state) => ({
        loanParams: {
          ...state.loanParams,
          housingFundPart: state.loanParams.housingFundPart
            ? { ...state.loanParams.housingFundPart, amount }
            : { amount, term: 360, interestRate: 0.032 }
        },
        results: null
      })),

    setHousingFundTerm: (term) =>
      set((state) => ({
        loanParams: {
          ...state.loanParams,
          housingFundPart: state.loanParams.housingFundPart
            ? { ...state.loanParams.housingFundPart, term }
            : { amount: 400000, term, interestRate: 0.032 }
        },
        results: null
      })),

    setHousingFundRate: (rate) =>
      set((state) => ({
        loanParams: {
          ...state.loanParams,
          housingFundPart: state.loanParams.housingFundPart
            ? { ...state.loanParams.housingFundPart, interestRate: rate }
            : { amount: 400000, term: 360, interestRate: rate }
        },
        results: null
      })),

    // 提前还款计划管理
    addPrepayment: (prepayment) =>
      set((state) => ({
        prepaymentPlan: [...state.prepaymentPlan, prepayment],
        results: null
      })),

    updatePrepayment: (id, updates) =>
      set((state) => ({
        prepaymentPlan: state.prepaymentPlan.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
        results: null
      })),

    removePrepayment: (id) =>
      set((state) => ({
        prepaymentPlan: state.prepaymentPlan.filter((p) => p.id !== id),
        results: null
      })),

    clearPrepayments: () =>
      set(() => ({
        prepaymentPlan: [],
        results: null
      })),

    // Worker初始化
    initWorker: () => {
      const { workerManager } = get();
      if (!workerManager.worker) {
        const worker = createWorker();
        
        worker.onmessage = (event) => {
          const { type, payload } = event.data;
          
          if (type === 'CALCULATION_COMPLETE') {
            set({
              results: payload,
              isCalculating: false,
              calculationError: null,
              workerManager: {
                ...get().workerManager,
                isCalculating: false
              }
            });
          } else if (type === 'CALCULATION_ERROR') {
            set({
              calculationError: payload.error,
              isCalculating: false,
              workerManager: {
                ...get().workerManager,
                isCalculating: false
              }
            });
          }
        };

        worker.onerror = (error) => {
          set({
            calculationError: 'Worker执行出错',
            isCalculating: false,
            workerManager: {
              ...get().workerManager,
              isCalculating: false
            }
          });
        };

        set({
          workerManager: {
            worker,
            isCalculating: false
          }
        });
      }
    },

    // Worker终止
    terminateWorker: () => {
      const { workerManager } = get();
      if (workerManager.worker) {
        workerManager.worker.terminate();
        set({
          workerManager: {
            worker: null,
            isCalculating: false
          }
        });
      }
    },

    // 执行计算
    calculate: async () => {
      const { loanParams, prepaymentPlan, workerManager, initWorker } = get();
      
      // 确保Worker已初始化
      if (!workerManager.worker) {
        initWorker();
      }

      const worker = get().workerManager.worker;
      if (!worker || workerManager.isCalculating) {
        return;
      }

      // 验证参数完整性
      try {
        if (loanParams.loanType === 'combination') {
          if (!loanParams.commercialPart || !loanParams.housingFundPart) {
            throw new Error('组合贷款参数不完整');
          }
        } else {
          if (!loanParams.amount || !loanParams.term || !loanParams.interestRate) {
            throw new Error('贷款参数不完整');
          }
        }
      } catch (error) {
        set({
          calculationError: error instanceof Error ? error.message : '参数验证失败',
          isCalculating: false
        });
        return;
      }

      set({
        isCalculating: true,
        calculationError: null,
        workerManager: {
          ...workerManager,
          isCalculating: true
        }
      });

      // 发送计算任务给Worker
      worker.postMessage({
        type: 'CALCULATE',
        payload: {
          params: loanParams,
          prepayments: prepaymentPlan
        }
      });
    },

    // 重置状态
    reset: () => {
      const { terminateWorker } = get();
      terminateWorker();
      
      set({
        loanParams: defaultLoanParams,
        prepaymentPlan: [],
        results: null,
        isCalculating: false,
        calculationError: null,
        workerManager: {
          worker: null,
          isCalculating: false
        }
      });
    }
  }))
);

// 自动计算订阅器
useLoanStore.subscribe(
  (state) => ({
    loanParams: state.loanParams,
    prepaymentPlan: state.prepaymentPlan
  }),
  () => {
    // 当贷款参数或提前还款计划发生变化时，自动触发计算
    const { calculate, isCalculating } = useLoanStore.getState();
    if (!isCalculating) {
      calculate();
    }
  },
  {
    equalityFn: (a, b) =>
      JSON.stringify(a.loanParams) === JSON.stringify(b.loanParams) &&
      JSON.stringify(a.prepaymentPlan) === JSON.stringify(b.prepaymentPlan)
  }
); 