'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Table, 
  Download, 
  GitCompare, 
  TrendingDown,
  BarChart3,
  Filter
} from 'lucide-react';
import { useLoanStore } from '../_store/loanStore';
import { formatCurrency } from '../_lib/formatters';
import { PaymentDetail, isCombinationLoanResults } from '../_core/types';



// 虚拟滚动组件
const VirtualizedTable = ({ 
  data, 
  highlightPrepayments = true,
  isCombination = false,
  originalResults = null,
  optimizedResults = null
}: { 
  data: PaymentDetail[];
  highlightPrepayments?: boolean;
  isCombination?: boolean;
  originalResults?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  optimizedResults?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [isLoading, setIsLoading] = useState(false);

  const visibleData = data.slice(visibleRange.start, visibleRange.end);

  // 处理滚动事件，滚动到底部时自动加载更多
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100; // 距离底部100px时开始加载
    
    if (isNearBottom && !isLoading && visibleRange.end < data.length) {
      setIsLoading(true);
      // 模拟加载延迟，提供更好的用户体验
      setTimeout(() => {
        setVisibleRange(prev => ({ ...prev, end: prev.end + 50 }));
        setIsLoading(false);
      }, 300);
    }
  };

  return (
    <div className="h-full flex flex-col border rounded-lg">
      <div className="flex-1 overflow-auto" onScroll={handleScroll}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="w-16 px-2 py-2 text-left font-medium text-gray-700">期数</th>
              <th className="px-2 py-2 text-right font-medium text-gray-700">月供</th>
              <th className="px-2 py-2 text-right font-medium text-gray-700">本金</th>
              {isCombination ? (
                <>
                  <th className="px-2 py-2 text-right font-medium text-gray-700">总利息</th>
                  <th className="px-2 py-2 text-right font-medium text-blue-700">商贷利息</th>
                  <th className="px-2 py-2 text-right font-medium text-green-700">公积金利息</th>
                </>
              ) : (
                <th className="px-2 py-2 text-right font-medium text-gray-700">利息</th>
              )}
              <th className="px-2 py-2 text-right font-medium text-gray-700">剩余本金</th>
            </tr>
          </thead>
          <tbody>
            {visibleData.map((row, index) => {
              // 获取组合贷款的详细数据
              let commercialInterest = 0;
              let housingFundInterest = 0;
              
              if (isCombination && optimizedResults) {
                const commercialDetail = optimizedResults.commercial.paymentSchedule[visibleRange.start + index];
                const housingFundDetail = optimizedResults.housingFund.paymentSchedule[visibleRange.start + index];
                commercialInterest = commercialDetail?.interest || 0;
                housingFundInterest = housingFundDetail?.interest || 0;
              }
              
              return (
                <motion.tr
                  key={row.period}
                  className={`border-b hover:bg-gray-50 ${
                    highlightPrepayments && row.isPrepayment ? 'bg-yellow-50 border-yellow-200' : ''
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.01 }}
                >
                  <td className="w-16 px-2 py-2">
                    <div className="flex items-center gap-1">
                      {row.period}
                      {row.isPrepayment && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full" title="提前还款期" />
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs">
                    {formatCurrency(row.payment, 'yuan', 0)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-blue-600 text-xs">
                    {formatCurrency(row.principal, 'yuan', 0)}
                  </td>
                  {isCombination ? (
                    <>
                      <td className="px-2 py-2 text-right font-mono text-red-600 text-xs">
                        {formatCurrency(row.interest, 'yuan', 0)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-blue-600 text-xs">
                        {formatCurrency(commercialInterest, 'yuan', 0)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-green-600 text-xs">
                        {formatCurrency(housingFundInterest, 'yuan', 0)}
                      </td>
                    </>
                  ) : (
                    <td className="px-2 py-2 text-right font-mono text-red-600 text-xs">
                      {formatCurrency(row.interest, 'yuan', 0)}
                    </td>
                  )}
                  <td className="px-2 py-2 text-right font-mono text-gray-600 text-xs">
                    {formatCurrency(row.remainingPrincipal, 'yuan', 0)}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        
        {/* 加载指示器 */}
        {isLoading && (
          <div className="p-4 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <motion.div
                className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              正在加载更多数据...
            </div>
          </div>
        )}
        
        {/* 加载完成提示 */}
        {visibleRange.end >= data.length && data.length > 50 && (
          <div className="p-4 text-center text-sm text-gray-400">
            已显示全部 {data.length} 条记录
          </div>
        )}
      </div>
    </div>
  );
};

export default function AnalyticsPanel() {
  const { results } = useLoanStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'comparison'>('schedule');
  const [showPrepaymentOnly, setShowPrepaymentOnly] = useState(false);

  if (!results) {
    return (
      <div className="p-6 text-center text-gray-500">
        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>暂无计算结果</p>
      </div>
    );
  }

  const { originalResults, optimizedResults, savings } = results;
  const isCombination = isCombinationLoanResults(originalResults) && isCombinationLoanResults(optimizedResults);

  // 获取还款计划表
  const getPaymentSchedule = (): PaymentDetail[] => {
    if (isCombination) {
      return optimizedResults.combined.paymentSchedule;
    } else {
      return (optimizedResults as any).paymentSchedule; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  };

  const schedule = getPaymentSchedule();
  const filteredSchedule = showPrepaymentOnly 
    ? schedule.filter((item: PaymentDetail) => item.isPrepayment)
    : schedule;

  // 获取核心指标
  const getCoreMetrics = () => {
    if (isCombination) {
      return {
        monthlyPayment: optimizedResults.combined.monthlyPayment,
        totalPayment: optimizedResults.combined.totalPayment,
        totalInterest: optimizedResults.combined.totalInterest,
        actualTerm: optimizedResults.combined.actualTerm,
        originalMonthlyPayment: originalResults.combined.monthlyPayment,
        originalTotalInterest: originalResults.combined.totalInterest,
        originalActualTerm: originalResults.combined.actualTerm
      };
    } else {
      const singleOptimized = optimizedResults as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const singleOriginal = originalResults as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      return {
        monthlyPayment: singleOptimized.monthlyPayment,
        totalPayment: singleOptimized.totalPayment,
        totalInterest: singleOptimized.totalInterest,
        actualTerm: singleOptimized.actualTerm,
        originalMonthlyPayment: singleOriginal.monthlyPayment,
        originalTotalInterest: singleOriginal.totalInterest,
        originalActualTerm: singleOriginal.actualTerm
      };
    }
  };

  const metrics = getCoreMetrics();

  return (
    <div className="bg-white flex flex-col">
      {/* 头部标签切换 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">深度分析</h3>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'schedule'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Table className="w-4 h-4 inline mr-2" />
            还款明细
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'comparison'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <GitCompare className="w-4 h-4 inline mr-2" />
            方案对比
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="h-96 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'schedule' && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col p-4 space-y-4"
            >
              {/* 过滤选项 */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <button
                  onClick={() => setShowPrepaymentOnly(!showPrepaymentOnly)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                    showPrepaymentOnly ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  仅显示提前还款期
                </button>
              </div>

              {/* 统计摘要 */}
              <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">实际还款期数</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {metrics.actualTerm} 期
                  </div>
                  {savings.termReduction > 0 && (
                    <div className="text-xs text-green-600">
                      减少 {savings.termReduction} 期
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">提前还款次数</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {filteredSchedule.filter(item => item.isPrepayment).length} 次
                  </div>
                </div>
              </div>

              {/* 还款时间表 */}
              <div className="flex-1 min-h-0">
                <VirtualizedTable 
                  data={filteredSchedule}
                  highlightPrepayments={true}
                  isCombination={isCombination}
                  originalResults={originalResults}
                  optimizedResults={optimizedResults}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'comparison' && (
            <motion.div
              key="comparison"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full p-4 space-y-6"
            >
              {/* 对比概览 */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">方案对比概览</h4>
                
                <div className="space-y-3">
                  {/* 月供对比 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">月供</span>
                      <div className="flex items-center gap-2">
                        {metrics.originalMonthlyPayment !== metrics.monthlyPayment && (
                          <TrendingDown className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">原始方案</div>
                        <div className="font-semibold">
                          {formatCurrency(metrics.originalMonthlyPayment, 'yuan', 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">优化方案</div>
                        <div className="font-semibold text-blue-600">
                          {formatCurrency(metrics.monthlyPayment, 'yuan', 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 总利息对比 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">总利息</span>
                      {savings.totalInterest > 0 && (
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingDown className="w-4 h-4" />
                          <span className="text-xs">
节省 {formatCurrency(savings.totalInterest, 'yuan', 0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">原始方案</div>
                        <div className="font-semibold text-red-600">
{formatCurrency(metrics.originalTotalInterest, 'yuan', 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">优化方案</div>
                        <div className="font-semibold text-green-600">
{formatCurrency(metrics.totalInterest, 'yuan', 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 还款期限对比 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">还款期限</span>
                      {savings.termReduction > 0 && (
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingDown className="w-4 h-4" />
                          <span className="text-xs">
                            缩短 {savings.termReduction} 期
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">原始方案</div>
                        <div className="font-semibold">
                          {metrics.originalActualTerm} 期
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">优化方案</div>
                        <div className="font-semibold text-blue-600">
                          {metrics.actualTerm} 期
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 节省效果分析 */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">节省效果分析</h4>
                
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">
{formatCurrency(savings.totalInterest, 'yuan', 0)}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">总共节省利息</div>
                    
                    {savings.termReduction > 0 && (
                      <div className="text-sm text-blue-600">
                        提前 {Math.floor(savings.termReduction / 12)} 年 
                        {savings.termReduction % 12} 个月还清贷款
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-500 text-center">
                  * 以上数据基于当前提前还款计划计算
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 