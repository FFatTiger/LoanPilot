'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  PieChart,
  BarChart3,
  Loader2,
  Calculator,
  Building2,
  Home,
  Info
} from 'lucide-react';
import { 
  PieChart as RechartsPieChart, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart,
  Pie
} from 'recharts';
import { useLoanStore } from '../_store/loanStore';
import { useUIStore } from '../_store/uiStore';
import { formatCurrency, formatSavings, animateNumber } from '../_lib/formatters';
import { isCombinationLoanResults } from '../_core/types';
import AnalyticsPanel from './AnalyticsPanel';

// 动画数字组件
const AnimatedNumber = ({ 
  value, 
  duration = 1000,
  formatter = (n: number) => n.toLocaleString()
}: { 
  value: number; 
  duration?: number;
  formatter?: (n: number) => string;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [prevValue, setPrevValue] = useState(0);

  useEffect(() => {
    if (value === prevValue) return;

    const startTime = Date.now();
    const startValue = displayValue;
    const targetValue = value;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentValue = animateNumber(startValue, targetValue, progress);
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setPrevValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, displayValue, prevValue]);

  return <span>{formatter(displayValue)}</span>;
};

// 指标卡片组件
const MetricCard = ({ 
  title, 
  value, 
  originalValue, 
  savings, 
  icon: Icon, 
  color, 
  delay = 0,
  amountUnit,
  showBreakdown = false,
  breakdown
}: {
  title: string;
  value: number;
  originalValue?: number;
  savings?: number;
  icon: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  color: string;
  delay?: number;
  amountUnit: string;
  showBreakdown?: boolean;
  breakdown?: { commercial: number; housingFund: number };
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-xl p-6 shadow-sm border relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600">{title}</p>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            <AnimatedNumber 
              value={value}
              formatter={(n) => formatCurrency(n, amountUnit as 'yuan' | 'wan', 0)}
            />
          </div>
          {originalValue && savings && savings > 0 && (
            <div className="text-xs text-gray-400 line-through mt-1">
              {formatCurrency(originalValue, amountUnit as 'yuan' | 'wan', 0)}
            </div>
          )}
        </div>
        <div className={`p-3 ${color} rounded-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {/* 悬浮提示 */}
      <AnimatePresence>
        {showTooltip && showBreakdown && breakdown && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 p-3 bg-white border rounded-lg shadow-lg z-10"
          >
            <div className="text-sm font-medium mb-2">{title}构成</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3 h-3 text-blue-600" />
                  <span>商业贷款</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(breakdown.commercial, amountUnit as 'yuan' | 'wan', 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="w-3 h-3 text-green-600" />
                  <span>公积金贷款</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(breakdown.housingFund, amountUnit as 'yuan' | 'wan', 0)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function MainDashboard() {
  const { results, isCalculating } = useLoanStore();
  const { amountUnit, showOriginalPlan } = useUIStore();
  const [chartMode, setChartMode] = useState<'payment' | 'breakdown'>('payment');

  if (isCalculating) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">正在计算中...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">请输入贷款参数开始计算</p>
        </div>
      </div>
    );
  }

  const { originalResults, optimizedResults, savings } = results;
  const isCombination = isCombinationLoanResults(originalResults) && isCombinationLoanResults(optimizedResults);

  // 准备图表数据
  let chartData: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (isCombination) {
    // 组合贷款：创建堆叠面积图数据
    const maxTerm = Math.max(
      optimizedResults.commercial.paymentSchedule.length,
      optimizedResults.housingFund.paymentSchedule.length
    );
    
    chartData = Array.from({ length: Math.min(maxTerm, 60) }, (_, index) => {
      const period = index + 1;
      const commercialDetail = optimizedResults.commercial.paymentSchedule[index];
      const housingFundDetail = optimizedResults.housingFund.paymentSchedule[index];
      const originalCommercial = originalResults.commercial.paymentSchedule[index];
      const originalHousingFund = originalResults.housingFund.paymentSchedule[index];

      return {
        period,
        commercialPayment: commercialDetail?.payment || 0,
        housingFundPayment: housingFundDetail?.payment || 0,
        commercialPrincipal: commercialDetail?.principal || 0,
        housingFundPrincipal: housingFundDetail?.principal || 0,
        commercialInterest: commercialDetail?.interest || 0,
        housingFundInterest: housingFundDetail?.interest || 0,
        totalPayment: (commercialDetail?.payment || 0) + (housingFundDetail?.payment || 0),
        totalPrincipal: (commercialDetail?.principal || 0) + (housingFundDetail?.principal || 0),
        totalInterest: (commercialDetail?.interest || 0) + (housingFundDetail?.interest || 0),
        originalTotalPayment: (originalCommercial?.payment || 0) + (originalHousingFund?.payment || 0)
      };
    });
  } else {
    // 单一贷款：增加本金和利息数据
    chartData = (optimizedResults as any).paymentSchedule.slice(0, 60).map((item: any, index: number) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      period: index + 1,
      payment: item.payment,
      principal: item.principal,
      interest: item.interest,
      originalPayment: (originalResults as any).paymentSchedule[index]?.payment || 0, // eslint-disable-line @typescript-eslint/no-explicit-any
      originalPrincipal: (originalResults as any).paymentSchedule[index]?.principal || 0, // eslint-disable-line @typescript-eslint/no-explicit-any
      originalInterest: (originalResults as any).paymentSchedule[index]?.interest || 0 // eslint-disable-line @typescript-eslint/no-explicit-any
    }));
  }

  // 饼图数据
  const pieData = isCombination ? [
    { 
      name: '商业贷款本金', 
      value: optimizedResults.commercial.totalPayment - optimizedResults.commercial.totalInterest, 
      color: '#3B82F6' 
    },
    { 
      name: '商业贷款利息', 
      value: optimizedResults.commercial.totalInterest, 
      color: '#1E40AF' 
    },
    { 
      name: '公积金贷款本金', 
      value: optimizedResults.housingFund.totalPayment - optimizedResults.housingFund.totalInterest, 
      color: '#10B981' 
    },
    { 
      name: '公积金贷款利息', 
      value: optimizedResults.housingFund.totalInterest, 
      color: '#047857' 
    }
  ] : [
    { name: '本金', value: (optimizedResults as any).totalPayment - (optimizedResults as any).totalInterest, color: '#3B82F6' }, // eslint-disable-line @typescript-eslint/no-explicit-any
    { name: '利息', value: (optimizedResults as any).totalInterest, color: '#EF4444' } // eslint-disable-line @typescript-eslint/no-explicit-any
  ];

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* 核心指标卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 月供 */}
          <MetricCard
            title="月供"
            value={isCombination ? optimizedResults.combined.monthlyPayment : (optimizedResults as any).monthlyPayment} // eslint-disable-line @typescript-eslint/no-explicit-any
            icon={Calendar}
            color="bg-blue-50 text-blue-600"
            amountUnit={amountUnit}
            showBreakdown={isCombination}
            breakdown={isCombination ? {
              commercial: optimizedResults.commercial.monthlyPayment,
              housingFund: optimizedResults.housingFund.monthlyPayment
            } : undefined}
          />

          {/* 总利息 */}
          <MetricCard
            title="总利息"
            value={isCombination ? optimizedResults.combined.totalInterest : (optimizedResults as any).totalInterest} // eslint-disable-line @typescript-eslint/no-explicit-any
            originalValue={isCombination ? originalResults.combined.totalInterest : (originalResults as any).totalInterest} // eslint-disable-line @typescript-eslint/no-explicit-any
            savings={savings.totalInterest}
            icon={TrendingUp}
            color="bg-red-50 text-red-600"
            delay={0.1}
            amountUnit={amountUnit}
            showBreakdown={isCombination}
            breakdown={isCombination ? {
              commercial: optimizedResults.commercial.totalInterest,
              housingFund: optimizedResults.housingFund.totalInterest
            } : undefined}
          />

          {/* 节省利息 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border relative overflow-hidden"
          >
            {savings.totalInterest > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-green-600/10" />
            )}
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">节省利息</p>
                <div className="text-2xl font-bold text-green-600 mt-1">
                  <AnimatedNumber 
                    value={savings.totalInterest}
                    formatter={(n) => formatSavings(n, amountUnit).text}
                  />
                </div>
                {savings.termReduction > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    提前{Math.floor(savings.termReduction / 12)}年{savings.termReduction % 12}个月还清
                  </div>
                )}
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <TrendingDown className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          {/* 总还款额 */}
          <MetricCard
            title="总还款额"
            value={isCombination ? optimizedResults.combined.totalPayment : (optimizedResults as any).totalPayment} // eslint-disable-line @typescript-eslint/no-explicit-any
            icon={DollarSign}
            color="bg-purple-50 text-purple-600"
            delay={0.3}
            amountUnit={amountUnit}
            showBreakdown={isCombination}
            breakdown={isCombination ? {
              commercial: optimizedResults.commercial.totalPayment,
              housingFund: optimizedResults.housingFund.totalPayment
            } : undefined}
          />
        </div>

        {/* 深度分析区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-xl shadow-sm border overflow-hidden"
        >
          <AnalyticsPanel />
        </motion.div>

        {/* 主图表区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-sm border"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">还款趋势分析</h3>
            <div className="flex gap-2">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button 
                  onClick={() => setChartMode('payment')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    chartMode === 'payment' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="w-3 h-3 inline mr-1" />
                  月供
                </button>
                <button 
                  onClick={() => setChartMode('breakdown')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    chartMode === 'breakdown' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <PieChart className="w-3 h-3 inline mr-1" />
                  本息分解
                </button>
              </div>
              {isCombination && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Info className="w-3 h-3" />
                  <span>蓝色=商贷，绿色=公积金</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {isCombination ? (
                // 组合贷款：堆叠面积图
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="commercialGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="housingFundGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="originalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="period" 
                    stroke="#6B7280"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    fontSize={12}
                    tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value, 'yuan', 0),
                      chartMode === 'payment' ? (
                        name === 'commercialPayment' ? '商业贷款月供' : 
                        name === 'housingFundPayment' ? '公积金贷款月供' :
                        name === 'totalPayment' ? '总月供' : 
                        name === 'originalTotalPayment' ? '原始总月供' : name
                      ) : (
                        name === 'commercialPrincipal' ? '商业贷款本金' :
                        name === 'housingFundPrincipal' ? '公积金贷款本金' :
                        name === 'commercialInterest' ? '商业贷款利息' :
                        name === 'housingFundInterest' ? '公积金贷款利息' : name
                      )
                    ]}
                    labelFormatter={(period) => `第 ${period} 期`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  {showOriginalPlan && (
                    <Area
                      type="monotone"
                      dataKey="originalTotalPayment"
                      stroke="#9CA3AF"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="url(#originalGradient)"
                    />
                  )}
                  {chartMode === 'payment' ? (
                    <>
                      <Area
                        type="monotone"
                        dataKey="commercialPayment"
                        stackId="1"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fill="url(#commercialGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="housingFundPayment"
                        stackId="1"
                        stroke="#10B981"
                        strokeWidth={2}
                        fill="url(#housingFundGradient)"
                      />
                    </>
                  ) : (
                    <>
                      <Area
                        type="monotone"
                        dataKey="commercialPrincipal"
                        stackId="1"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fill="url(#commercialGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="housingFundPrincipal"
                        stackId="1"
                        stroke="#10B981"
                        strokeWidth={2}
                        fill="url(#housingFundGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="commercialInterest"
                        stackId="2"
                        stroke="#1E40AF"
                        strokeWidth={1}
                        fill="rgba(30, 64, 175, 0.2)"
                        strokeDasharray="3 3"
                      />
                      <Area
                        type="monotone"
                        dataKey="housingFundInterest"
                        stackId="2"
                        stroke="#047857"
                        strokeWidth={1}
                        fill="rgba(4, 120, 87, 0.2)"
                        strokeDasharray="3 3"
                      />
                    </>
                  )}
                </AreaChart>
              ) : (
                // 单一贷款：原有的面积图
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="paymentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="principalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="interestGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="originalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="period" 
                    stroke="#6B7280"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    fontSize={12}
                    tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value, 'yuan', 0),
                      chartMode === 'payment' ? (
                        name === 'payment' ? '当前月供' : name === 'originalPayment' ? '原始月供' : name
                      ) : (
                        name === 'principal' ? '本金' : 
                        name === 'interest' ? '利息' :
                        name === 'originalPrincipal' ? '原始本金' :
                        name === 'originalInterest' ? '原始利息' : name
                      )
                    ]}
                    labelFormatter={(period) => `第 ${period} 期`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  {showOriginalPlan && (
                    <Area
                      type="monotone"
                      dataKey="originalPayment"
                      stroke="#9CA3AF"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="url(#originalGradient)"
                    />
                  )}
                  {chartMode === 'payment' ? (
                    <Area
                      type="monotone"
                      dataKey="payment"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      fill="url(#paymentGradient)"
                    />
                  ) : (
                    <>
                      <Area
                        type="monotone"
                        dataKey="principal"
                        stackId="1"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fill="url(#principalGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="interest"
                        stackId="1"
                        stroke="#EF4444"
                        strokeWidth={2}
                        fill="url(#interestGradient)"
                      />
                    </>
                  )}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* 本息构成饼图 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 shadow-sm border"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {isCombination ? '组合贷款构成' : '总还款构成'}
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value, amountUnit, 0)}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {pieData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(item.value, amountUnit, 0)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {((item.value / (isCombination ? optimizedResults.combined.totalPayment : (optimizedResults as any).totalPayment)) * 100).toFixed(1)}% {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 