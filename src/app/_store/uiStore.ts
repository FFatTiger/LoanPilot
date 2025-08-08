import { create } from 'zustand';

// UI状态接口
interface UIState {
  // 布局状态
  isMobile: boolean;
  sidebarCollapsed: boolean;
  
  // 面板状态
  activePanel: 'control' | 'dashboard' | 'analytics';
  showComparisonMode: boolean;
  
  // 输入状态
  amountUnit: 'yuan' | 'wan'; // 金额单位：元 | 万元
  showAdvancedSettings: boolean;
  
  // 图表状态
  chartType: 'combined' | 'payment' | 'principal-interest';
  showOriginalPlan: boolean;
  
  // 模态框状态
  showPrepaymentModal: boolean;
  editingPrepaymentId: string | null;
  
  // 动画状态
  isAnimating: boolean;
  animationQueue: string[];
  
  // Actions
  setIsMobile: (isMobile: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActivePanel: (panel: 'control' | 'dashboard' | 'analytics') => void;
  toggleComparisonMode: () => void;
  setAmountUnit: (unit: 'yuan' | 'wan') => void;
  toggleAdvancedSettings: () => void;
  setChartType: (type: 'combined' | 'payment' | 'principal-interest') => void;
  toggleOriginalPlan: () => void;
  
  openPrepaymentModal: (editingId?: string) => void;
  closePrepaymentModal: () => void;
  
  startAnimation: (animationId: string) => void;
  completeAnimation: (animationId: string) => void;
  
  reset: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // 初始状态
  isMobile: false,
  sidebarCollapsed: false,
  activePanel: 'dashboard',
  showComparisonMode: false,
  amountUnit: 'wan',
  showAdvancedSettings: false,
  chartType: 'combined',
  showOriginalPlan: true,
  showPrepaymentModal: false,
  editingPrepaymentId: null,
  isAnimating: false,
  animationQueue: [],

  // 布局相关
  setIsMobile: (isMobile) => set({ isMobile }),
  
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  setActivePanel: (panel) => set({ activePanel: panel }),
  
  toggleComparisonMode: () => set((state) => ({ 
    showComparisonMode: !state.showComparisonMode 
  })),

  // 输入相关
  setAmountUnit: (unit) => set({ amountUnit: unit }),
  
  toggleAdvancedSettings: () => set((state) => ({ 
    showAdvancedSettings: !state.showAdvancedSettings 
  })),

  // 图表相关
  setChartType: (type) => set({ chartType: type }),
  
  toggleOriginalPlan: () => set((state) => ({ 
    showOriginalPlan: !state.showOriginalPlan 
  })),

  // 模态框相关
  openPrepaymentModal: (editingId) => set({ 
    showPrepaymentModal: true,
    editingPrepaymentId: editingId || null
  }),
  
  closePrepaymentModal: () => set({ 
    showPrepaymentModal: false,
    editingPrepaymentId: null
  }),

  // 动画相关
  startAnimation: (animationId) => {
    const { animationQueue } = get();
    set({
      isAnimating: true,
      animationQueue: [...animationQueue, animationId]
    });
  },
  
  completeAnimation: (animationId) => {
    const { animationQueue } = get();
    const newQueue = animationQueue.filter(id => id !== animationId);
    set({
      animationQueue: newQueue,
      isAnimating: newQueue.length > 0
    });
  },

  // 重置状态
  reset: () => set({
    isMobile: false,
    sidebarCollapsed: false,
    activePanel: 'dashboard',
    showComparisonMode: false,
    amountUnit: 'wan',
    showAdvancedSettings: false,
    chartType: 'combined',
    showOriginalPlan: true,
    showPrepaymentModal: false,
    editingPrepaymentId: null,
    isAnimating: false,
    animationQueue: []
  })
})); 