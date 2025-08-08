'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar, 
  DollarSign, 
  Target, 
  FastForward, 
  TrendingDown, 
  Building2, 
  Home,
  HelpCircle
} from 'lucide-react';
import { useLoanStore } from '../_store/loanStore';
import { useUIStore } from '../_store/uiStore';
import { formatCurrency, parseAmount, convertAmountUnit } from '../_lib/formatters';
import { Prepayment, PrepaymentStrategy, isCombinationLoanResults } from '../_core/types';

export default function PrepaymentModal() {
  const {
    loanParams,
    prepaymentPlan,
    addPrepayment,
    updatePrepayment,
    results
  } = useLoanStore();

  const {
    showPrepaymentModal,
    editingPrepaymentId,
    closePrepaymentModal,
    amountUnit
  } = useUIStore();

  // 表单状态
  const [month, setMonth] = useState(12);
  const [amount, setAmount] = useState('');
  const [strategy, setStrategy] = useState<PrepaymentStrategy>('reduce-term');
  const [targetLoan, setTargetLoan] = useState<'commercial' | 'housing-fund' | undefined>(undefined);

  // 编辑模式
  const isEditing = !!editingPrepaymentId;
  const editingPrepayment = prepaymentPlan.find(p => p.id === editingPrepaymentId);
  const isCombination = loanParams.loanType === 'combination';

  // 初始化表单数据
  useEffect(() => {
    if (isEditing && editingPrepayment) {
      setMonth(editingPrepayment.month);
      setAmount(convertAmountUnit(editingPrepayment.amount, 'yuan', amountUnit).toString());
      setStrategy(editingPrepayment.strategy);
      setTargetLoan(editingPrepayment.targetLoan);
    } else {
      // 新建模式，设置默认值
      setMonth(12);
      setAmount('');
      setStrategy('reduce-term');
      // 组合贷款时，默认选择利率较高的贷款
      if (isCombination && loanParams.commercialPart && loanParams.housingFundPart) {
        const commercialRate = loanParams.commercialPart.interestRate;
        const housingFundRate = loanParams.housingFundPart.interestRate;
        setTargetLoan(commercialRate >= housingFundRate ? 'commercial' : 'housing-fund');
      } else {
        setTargetLoan(undefined);
      }
    }
  }, [isEditing, editingPrepayment, amountUnit, isCombination, loanParams]);

  // 处理提交
  const handleSubmit = () => {
    const parsedAmount = parseAmount(amount, amountUnit);
    
    if (!parsedAmount || parsedAmount <= 0) {
      alert('请输入有效的还款金额');
      return;
    }

    // 获取期限限制
    const maxTerm = isCombination 
      ? Math.max(
          loanParams.commercialPart?.term || 0,
          loanParams.housingFundPart?.term || 0
        )
      : loanParams.term || 0;

    if (month <= 0 || month > maxTerm) {
      alert('请输入有效的还款月份');
      return;
    }

    // 组合贷款必须选择目标贷款
    if (isCombination && !targetLoan) {
      alert('请选择还款目标贷款');
      return;
    }

    const prepayment: Prepayment = {
      id: isEditing ? editingPrepaymentId! : Date.now().toString(),
      month,
      amount: parsedAmount,
      strategy,
      targetLoan: isCombination ? targetLoan : undefined
    };

    if (isEditing) {
      updatePrepayment(prepayment.id, prepayment);
    } else {
      addPrepayment(prepayment);
    }

    closePrepaymentModal();
  };

  // 计算剩余本金（用于验证）
  const getRemainingPrincipal = (targetMonth: number): number => {
    if (!results) {
      if (isCombination) {
        const commercial = loanParams.commercialPart?.amount || 0;
        const housingFund = loanParams.housingFundPart?.amount || 0;
        return commercial + housingFund;
      }
      return loanParams.amount || 0;
    }
    
    if (isCombination && isCombinationLoanResults(results.originalResults)) {
      if (targetLoan === 'commercial') {
        const schedule = results.originalResults.commercial.paymentSchedule;
        if (targetMonth <= 0 || targetMonth > schedule.length) {
          return loanParams.commercialPart?.amount || 0;
        }
        return schedule[targetMonth - 1].remainingPrincipal;
      } else if (targetLoan === 'housing-fund') {
        const schedule = results.originalResults.housingFund.paymentSchedule;
        if (targetMonth <= 0 || targetMonth > schedule.length) {
          return loanParams.housingFundPart?.amount || 0;
        }
        return schedule[targetMonth - 1].remainingPrincipal;
      } else {
        // 未选择目标贷款时，返回总和
        const commercialSchedule = results.originalResults.commercial.paymentSchedule;
        const housingFundSchedule = results.originalResults.housingFund.paymentSchedule;
        const commercialRemaining = targetMonth <= commercialSchedule.length 
          ? commercialSchedule[targetMonth - 1]?.remainingPrincipal || 0
          : 0;
        const housingFundRemaining = targetMonth <= housingFundSchedule.length 
          ? housingFundSchedule[targetMonth - 1]?.remainingPrincipal || 0
          : 0;
        return commercialRemaining + housingFundRemaining;
      }
    } else {
      // 单一贷款
      if (!isCombinationLoanResults(results.originalResults)) {
        const schedule = results.originalResults.paymentSchedule;
        if (targetMonth <= 0 || targetMonth > schedule.length) {
          return loanParams.amount || 0;
        }
        return schedule[targetMonth - 1].remainingPrincipal;
      } else {
        // 组合贷款情况已在上面处理
        return 0;
      }
    }
  };

  const maxAmount = getRemainingPrincipal(month);
  const maxTerm = isCombination 
    ? Math.max(
        loanParams.commercialPart?.term || 0,
        loanParams.housingFundPart?.term || 0
      )
    : loanParams.term || 0;

  return (
    <AnimatePresence>
      {showPrepaymentModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closePrepaymentModal}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? '编辑提前还款' : '添加提前还款'}
              </h2>
              <button
                onClick={closePrepaymentModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-6 space-y-6">
              {/* 组合贷款目标选择 */}
              {isCombination && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Target className="w-4 h-4" />
                    还款目标
                    <div className="relative group">
                      <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        建议优先还利率较高的贷款
                      </div>
                    </div>
                  </label>
                  <div className="space-y-2">
                    <button
                      onClick={() => setTargetLoan('commercial')}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        targetLoan === 'commercial'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <div className="flex-1">
                          <div className="font-medium">商业贷款</div>
                          <div className="text-sm text-gray-500">
                            利率: {((loanParams.commercialPart?.interestRate || 0) * 100).toFixed(2)}%
                          </div>
                        </div>
                        {loanParams.commercialPart && loanParams.housingFundPart && 
                         loanParams.commercialPart.interestRate >= loanParams.housingFundPart.interestRate && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            推荐
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => setTargetLoan('housing-fund')}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        targetLoan === 'housing-fund'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Home className="w-4 h-4 text-green-600" />
                        <div className="flex-1">
                          <div className="font-medium">公积金贷款</div>
                          <div className="text-sm text-gray-500">
                            利率: {((loanParams.housingFundPart?.interestRate || 0) * 100).toFixed(2)}%
                          </div>
                        </div>
                        {loanParams.commercialPart && loanParams.housingFundPart && 
                         loanParams.housingFundPart.interestRate > loanParams.commercialPart.interestRate && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            推荐
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* 还款时间 */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar className="w-4 h-4" />
                  还款时间
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="range"
                      min="1"
                      max={maxTerm}
                      value={month}
                      onChange={(e) => setMonth(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  <div className="text-sm text-gray-600 min-w-[80px] text-right">
                    第 {month} 个月
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  该月剩余本金：{formatCurrency(maxAmount, amountUnit)}
                  {isCombination && targetLoan && (
                    <span className="ml-2 text-blue-600">
                      ({targetLoan === 'commercial' ? '商业贷款' : '公积金贷款'})
                    </span>
                  )}
                </div>
              </div>

              {/* 还款金额 */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <DollarSign className="w-4 h-4" />
                  还款金额
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入提前还款金额"
                  />
                  <div className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                    {amountUnit === 'yuan' ? '元' : '万元'}
                  </div>
                </div>
                <div className="flex">
                  <input
                    type="range"
                    min="0"
                    max={convertAmountUnit(maxAmount, 'yuan', amountUnit)}
                    step={amountUnit === 'yuan' ? '1000' : '0.1'}
                    value={parseAmount(amount, amountUnit) ? convertAmountUnit(parseAmount(amount, amountUnit), 'yuan', amountUnit) : 0}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              </div>

              {/* 还款策略 */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Target className="w-4 h-4" />
                  还款策略
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setStrategy('reduce-term')}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      strategy === 'reduce-term'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FastForward className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium">缩短期限</div>
                        <div className="text-sm text-gray-500">月供不变，更快还完</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setStrategy('reduce-payment')}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      strategy === 'reduce-payment'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TrendingDown className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium">减少月供</div>
                        <div className="text-sm text-gray-500">期限不变，月供更少</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={closePrepaymentModal}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isEditing ? '更新' : '添加'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 