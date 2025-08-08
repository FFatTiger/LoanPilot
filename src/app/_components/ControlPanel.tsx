'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Home, 
  Plus, 
  Settings, 
  Calculator,
  Trash2,
  Edit3,
  Calendar,
  DollarSign,
  Combine
} from 'lucide-react';
import { useLoanStore } from '../_store/loanStore';
import { useUIStore } from '../_store/uiStore';
import { formatCurrency, formatPercentage, parseAmount, parseRate, convertAmountUnit } from '../_lib/formatters';
import { LoanType, RepaymentMethod, PrepaymentStrategy } from '../_core/types';

export default function ControlPanel() {
  const {
    loanParams,
    prepaymentPlan,
    setLoanType,
    setRepaymentMethod,
    setLoanAmount,
    setLoanTerm,
    setInterestRate,
    setCommercialAmount,
    setCommercialTerm,
    setCommercialRate,
    setHousingFundAmount,
    setHousingFundTerm,
    setHousingFundRate,
    addPrepayment,
    removePrepayment
  } = useLoanStore();

  const {
    amountUnit,
    setAmountUnit,
    showAdvancedSettings,
    toggleAdvancedSettings,
    openPrepaymentModal
  } = useUIStore();

  // 定义本地状态类型
  type LocalState = {
    singleAmount?: string;
    singleTerm?: string;
    singleRate?: string;
    commercialAmount?: string;
    commercialTerm?: string;
    commercialRate?: string;
    housingFundAmount?: string;
    housingFundTerm?: string;
    housingFundRate?: string;
  };

  // 本地输入状态 - 根据贷款类型动态初始化
  const initializeLocalState = (): LocalState => {
    if (loanParams.loanType === 'combination') {
      return {
        // 组合贷款状态
        commercialAmount: loanParams.commercialPart 
          ? convertAmountUnit(loanParams.commercialPart.amount, 'yuan', amountUnit).toString()
          : '60',
        commercialTerm: loanParams.commercialPart 
          ? (loanParams.commercialPart.term / 12).toString()
          : '30',
        commercialRate: loanParams.commercialPart 
          ? (loanParams.commercialPart.interestRate * 100).toFixed(2)
          : '4.50',
        housingFundAmount: loanParams.housingFundPart 
          ? convertAmountUnit(loanParams.housingFundPart.amount, 'yuan', amountUnit).toString()
          : '40',
        housingFundTerm: loanParams.housingFundPart 
          ? (loanParams.housingFundPart.term / 12).toString()
          : '30',
        housingFundRate: loanParams.housingFundPart 
          ? (loanParams.housingFundPart.interestRate * 100).toFixed(2)
          : '3.20'
      };
    } else {
      return {
        // 单一贷款状态
        singleAmount: loanParams.amount 
          ? convertAmountUnit(loanParams.amount, 'yuan', amountUnit).toString()
          : '100',
        singleTerm: loanParams.term 
          ? (loanParams.term / 12).toString()
          : '30',
        singleRate: loanParams.interestRate 
          ? (loanParams.interestRate * 100).toFixed(2)
          : '4.50'
      };
    }
  };

  const [localState, setLocalState] = useState<LocalState>(initializeLocalState);

  // 同步本地状态与store状态
  useEffect(() => {
    setLocalState(initializeLocalState());
  }, [loanParams, amountUnit]);

  // 单一贷款输入处理
  const handleSingleAmountChange = (value: string) => {
    setLocalState(prev => ({ ...prev, singleAmount: value }));
    const amount = parseAmount(value, amountUnit);
    if (!isNaN(amount) && amount > 0) {
      setLoanAmount(amount);
    }
  };

  const handleSingleTermChange = (value: string) => {
    setLocalState(prev => ({ ...prev, singleTerm: value }));
    const years = parseFloat(value);
    if (!isNaN(years) && years > 0) {
      setLoanTerm(Math.round(years * 12));
    }
  };

  const handleSingleRateChange = (value: string) => {
    setLocalState(prev => ({ ...prev, singleRate: value }));
    const rate = parseRate(value);
    if (!isNaN(rate) && rate > 0) {
      setInterestRate(rate);
    }
  };

  // 组合贷款输入处理 - 商业贷款
  const handleCommercialAmountChange = (value: string) => {
    setLocalState(prev => ({ ...prev, commercialAmount: value }));
    const amount = parseAmount(value, amountUnit);
    if (!isNaN(amount) && amount > 0) {
      setCommercialAmount(amount);
    }
  };

  const handleCommercialTermChange = (value: string) => {
    setLocalState(prev => ({ ...prev, commercialTerm: value }));
    const years = parseFloat(value);
    if (!isNaN(years) && years > 0) {
      setCommercialTerm(Math.round(years * 12));
    }
  };

  const handleCommercialRateChange = (value: string) => {
    setLocalState(prev => ({ ...prev, commercialRate: value }));
    const rate = parseRate(value);
    if (!isNaN(rate) && rate > 0) {
      setCommercialRate(rate);
    }
  };

  // 组合贷款输入处理 - 公积金贷款
  const handleHousingFundAmountChange = (value: string) => {
    setLocalState(prev => ({ ...prev, housingFundAmount: value }));
    const amount = parseAmount(value, amountUnit);
    if (!isNaN(amount) && amount > 0) {
      setHousingFundAmount(amount);
    }
  };

  const handleHousingFundTermChange = (value: string) => {
    setLocalState(prev => ({ ...prev, housingFundTerm: value }));
    const years = parseFloat(value);
    if (!isNaN(years) && years > 0) {
      setHousingFundTerm(Math.round(years * 12));
    }
  };

  const handleHousingFundRateChange = (value: string) => {
    setLocalState(prev => ({ ...prev, housingFundRate: value }));
    const rate = parseRate(value);
    if (!isNaN(rate) && rate > 0) {
      setHousingFundRate(rate);
    }
  };

  // 处理单位切换
  const handleUnitToggle = () => {
    const newUnit = amountUnit === 'yuan' ? 'wan' : 'yuan';
    setAmountUnit(newUnit);
  };

  // 获取总贷款额（用于滑块）
  const getTotalAmount = () => {
    if (loanParams.loanType === 'combination') {
      const commercial = loanParams.commercialPart?.amount || 0;
      const housingFund = loanParams.housingFundPart?.amount || 0;
      return commercial + housingFund;
    }
    return loanParams.amount || 0;
  };

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="h-full bg-white border-r border-gray-200 overflow-y-auto"
    >
      <div className="p-6 space-y-6">
        {/* 标题 */}
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">贷款计算器</h2>
        </div>

        {/* 贷款类型选择 */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            贷款类型
          </label>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => setLoanType('commercial')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                loanParams.loanType === 'commercial'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span className="text-sm">商业贷款</span>
            </button>
            <button
              onClick={() => setLoanType('housing-fund')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                loanParams.loanType === 'housing-fund'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">公积金贷款</span>
            </button>
            <button
              onClick={() => setLoanType('combination')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                loanParams.loanType === 'combination'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Combine className="w-4 h-4" />
              <span className="text-sm">组合贷款</span>
            </button>
          </div>
        </div>

        {/* 还款方式选择 */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            还款方式
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setRepaymentMethod('equal-installment')}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                loanParams.repaymentMethod === 'equal-installment'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">等额本息</div>
              <div className="text-xs text-gray-500 mt-1">每月还款额固定，压力平稳</div>
            </button>
            <button
              onClick={() => setRepaymentMethod('equal-principal')}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                loanParams.repaymentMethod === 'equal-principal'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">等额本金</div>
              <div className="text-xs text-gray-500 mt-1">前期月供较高，逐月递减</div>
            </button>
          </div>
        </div>

        {/* 贷款参数输入区域 */}
        <AnimatePresence mode="wait">
          {loanParams.loanType === 'combination' ? (
            /* 组合贷款输入 */
            <motion.div
              key="combination"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-6"
            >
              {/* 商业贷款部分 */}
              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50/30">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium text-blue-900">商业贷款部分</h3>
                </div>
                
                <div className="space-y-4">
                  {/* 商业贷款金额 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      贷款金额
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={localState.commercialAmount || ''}
                        onChange={(e) => handleCommercialAmountChange(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="商业贷款金额"
                      />
                      <button
                        onClick={handleUnitToggle}
                        className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors"
                      >
                        {amountUnit === 'yuan' ? '元' : '万元'}
                      </button>
                    </div>
                  </div>

                  {/* 商业贷款期限 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      贷款期限
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={localState.commercialTerm || ''}
                        onChange={(e) => handleCommercialTermChange(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="商业贷款年限"
                      />
                      <div className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                        年
                      </div>
                    </div>
                  </div>

                  {/* 商业贷款利率 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      年利率
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={localState.commercialRate || ''}
                        onChange={(e) => handleCommercialRateChange(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="商业贷款利率"
                      />
                      <div className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                        %
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 公积金贷款部分 */}
              <div className="p-4 border border-green-200 rounded-lg bg-green-50/30">
                <div className="flex items-center gap-2 mb-4">
                  <Home className="w-4 h-4 text-green-600" />
                  <h3 className="font-medium text-green-900">公积金贷款部分</h3>
                </div>
                
                <div className="space-y-4">
                  {/* 公积金贷款金额 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      贷款金额
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={localState.housingFundAmount || ''}
                        onChange={(e) => handleHousingFundAmountChange(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="公积金贷款金额"
                      />
                      <button
                        onClick={handleUnitToggle}
                        className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors"
                      >
                        {amountUnit === 'yuan' ? '元' : '万元'}
                      </button>
                    </div>
                  </div>

                  {/* 公积金贷款期限 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      贷款期限
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={localState.housingFundTerm || ''}
                        onChange={(e) => handleHousingFundTermChange(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="公积金贷款年限"
                      />
                      <div className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                        年
                      </div>
                    </div>
                  </div>

                  {/* 公积金贷款利率 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      年利率
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={localState.housingFundRate || ''}
                        onChange={(e) => handleHousingFundRateChange(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="公积金贷款利率"
                      />
                      <div className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                        %
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 总贷款额预览 */}
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-900">总贷款额</span>
                  <span className="text-lg font-bold text-purple-700">
                    {formatCurrency(getTotalAmount(), amountUnit, 0)}
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            /* 单一贷款输入 */
            <motion.div
              key="single"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* 贷款金额 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  贷款金额
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={localState.singleAmount || ''}
                    onChange={(e) => handleSingleAmountChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入贷款金额"
                  />
                  <button
                    onClick={handleUnitToggle}
                    className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors"
                  >
                    {amountUnit === 'yuan' ? '元' : '万元'}
                  </button>
                </div>
                <div className="flex">
                  <input
                    type="range"
                    min="0"
                    max={amountUnit === 'yuan' ? '10000000' : '1000'}
                    step={amountUnit === 'yuan' ? '10000' : '1'}
                    value={convertAmountUnit(loanParams.amount || 0, 'yuan', amountUnit)}
                    onChange={(e) => handleSingleAmountChange(e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              </div>

              {/* 贷款期限 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  贷款期限
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={localState.singleTerm || ''}
                    onChange={(e) => handleSingleTermChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入贷款年限"
                  />
                  <div className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                    年
                  </div>
                </div>
                <div className="flex">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={(loanParams.term || 360) / 12}
                    onChange={(e) => handleSingleTermChange(e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              </div>

              {/* 利率 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    年利率
                  </label>
                  <button className="text-xs text-blue-600 hover:text-blue-700">
                    获取最新LPR
                  </button>
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={localState.singleRate || ''}
                    onChange={(e) => handleSingleRateChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入年利率"
                  />
                  <div className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                    %
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 提前还款计划 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              提前还款计划
            </label>
            <button
              onClick={() => openPrepaymentModal()}
              className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加
            </button>
          </div>
          
          <AnimatePresence>
            {prepaymentPlan.map((prepayment) => (
              <motion.div
                key={prepayment.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>第{prepayment.month}个月</span>
                      {prepayment.targetLoan && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          prepayment.targetLoan === 'commercial' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {prepayment.targetLoan === 'commercial' ? '商贷' : '公积金'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span>{formatCurrency(prepayment.amount, amountUnit)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {prepayment.strategy === 'reduce-term' ? '缩短期限' : '减少月供'}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openPrepaymentModal(prepayment.id)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removePrepayment(prepayment.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {prepaymentPlan.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无提前还款计划</p>
              <button
                onClick={() => openPrepaymentModal()}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                添加第一个计划
              </button>
            </div>
          )}
        </div>

        {/* 高级设置 */}
        <div className="border-t pt-4">
          <button
            onClick={toggleAdvancedSettings}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            高级设置
            <motion.div
              animate={{ rotate: showAdvancedSettings ? 180 : 0 }}
              className="ml-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </button>
          
          <AnimatePresence>
            {showAdvancedSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 space-y-3 overflow-hidden"
              >
                <div className="text-xs text-gray-500">
                  更多设置功能即将上线...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
} 