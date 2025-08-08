'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLoanStore } from './_store/loanStore';
import { useUIStore } from './_store/uiStore';
import ControlPanel from './_components/ControlPanel';
import MainDashboard from './_components/MainDashboard';
import PrepaymentModal from './_components/PrepaymentModal';

export default function Home() {
  const { initWorker, calculate } = useLoanStore();
  const { isMobile, setIsMobile } = useUIStore();

  // 初始化
  useEffect(() => {
    // 初始化Web Worker
    initWorker();
    
    // 执行初始计算
    calculate();

    // 检测屏幕尺寸
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, [initWorker, calculate, setIsMobile]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 头部标题栏 */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white border-b border-gray-200 px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              高精度贷款计算器
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              专业的贷款与提前还款规划工具
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              支持等额本息 · 等额本金 · 提前还款优化
            </div>
          </div>
        </div>
      </motion.header>

      {/* 主体内容区域 */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* 桌面端：三栏布局 */}
        {!isMobile && (
          <>
            {/* 左侧控制面板 */}
            <div className="w-80 flex-shrink-0">
              <ControlPanel />
            </div>

            {/* 中间主仪表盘 - 扩展宽度 */}
            <div className="flex-1">
              <MainDashboard />
            </div>
          </>
        )}

        {/* 移动端：单栏布局 */}
        {isMobile && (
          <div className="flex-1 flex flex-col">
            {/* 主仪表盘优先显示 */}
            <div className="flex-1">
              <MainDashboard />
            </div>
            
            {/* 控制面板（可折叠） */}
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="bg-white border-t border-gray-200 max-h-96 overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
                </div>
                <ControlPanel />
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* 全局样式 */}
      <style jsx global>{`
        /* 自定义滑块样式 */
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .slider::-webkit-slider-track {
          background: #E5E7EB;
          border-radius: 10px;
        }

        .slider::-moz-range-track {
          background: #E5E7EB;
          border-radius: 10px;
        }

        /* 滚动条样式 */
        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
                 }
       `}</style>

       {/* 全局模态框 */}
       <PrepaymentModal />
     </div>
   );
 }
