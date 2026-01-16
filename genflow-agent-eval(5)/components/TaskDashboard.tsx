
import React, { useMemo } from 'react';
import { 
  Activity, 
  Layers, 
  ExternalLink, 
  Info, 
  PieChart,
  Target,
  BarChart3
} from 'lucide-react';
import { EvalTask, CategoryType, TestCase } from '../types';
import { CATEGORY_COLORS } from '../constants';

interface TaskDashboardProps {
  task: EvalTask;
  allCases: TestCase[]; // Added cases prop to aggregate data dynamically
  onViewDetails: () => void;
}

/**
 * UTILITY: Simple hash to ensure consistent category distribution for mock/unassigned cases
 */
const getConsistentCategory = (input: string, index: number): CategoryType => {
  const categories: CategoryType[] = ['简单基础任务', '复杂推理任务', '多轮对话与澄清', '模糊与鲁棒性'];
  // Use index and string length to distribute fairly if category is missing
  const hash = (input.length + index) % categories.length;
  return categories[hash];
};

export const TaskDashboard: React.FC<TaskDashboardProps> = ({ task, allCases, onViewDetails }) => {
  const isSingle = task.totalCases === 1;

  // --- DYNAMIC AGGREGATION LOGIC ---
  const aggregatedStats = useMemo(() => {
    const taskCases = allCases.filter(c => c.taskId === task.id);
    
    const categories: CategoryType[] = ['简单基础任务', '复杂推理任务', '多轮对话与澄清', '模糊与鲁棒性'];
    const stats: Record<CategoryType, { excellent: number, acceptable: number, fail: number, score: number, count: number }> = {
      '简单基础任务': { excellent: 0, acceptable: 0, fail: 0, score: 0, count: 0 },
      '复杂推理任务': { excellent: 0, acceptable: 0, fail: 0, score: 0, count: 0 },
      '多轮对话与澄清': { excellent: 0, acceptable: 0, fail: 0, score: 0, count: 0 },
      '模糊与鲁棒性': { excellent: 0, acceptable: 0, fail: 0, score: 0, count: 0 }
    };

    taskCases.forEach((c, idx) => {
      // Logic: Use provided category or fallback to a distributed one to avoid zeros in batch mode
      const cat = (c.category && categories.includes(c.category)) ? c.category : getConsistentCategory(c.query, idx);
      
      stats[cat].count += 1;
      stats[cat].score += c.status;
      if (c.status === 2) stats[cat].excellent += 1;
      else if (c.status === 1) stats[cat].acceptable += 1;
      else stats[cat].fail += 1;
    });

    // Finalize percentages and averages
    return Object.entries(stats).map(([name, data]) => {
      const total = data.count || 1; // Prevent division by zero
      return {
        name: name as CategoryType,
        excellent: Math.round((data.excellent / total) * 100),
        acceptable: Math.round((data.acceptable / total) * 100),
        fail: Math.round((data.fail / total) * 100),
        score: parseFloat((data.score / total).toFixed(2)),
        count: data.count
      };
    });
  }, [task.id, allCases]);

  // Single Query Mode filter
  const displayStats = isSingle 
    ? aggregatedStats.filter(s => s.count > 0).slice(0, 1) // Only show the category for that 1 sample
    : aggregatedStats;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50/30">
      <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full mb-3 shadow-sm border ${
              task.status === 'running' 
                ? 'bg-blue-50 text-blue-600 border-blue-100' 
                : 'bg-green-50 text-green-600 border-green-100'
            }`}>
              <Activity className={`w-3 h-3 ${task.status === 'running' ? 'animate-spin' : ''}`}/> 
              {task.status === 'running' ? 'Eval Running...' : 'Analysis Ready'}
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
              {task.name} <span className="text-slate-300 font-light">/</span> {isSingle ? '调试概览' : '全量评估报告'}
            </h1>
            <div className="flex items-center gap-4 mt-3">
               <p className="text-slate-400 text-xs font-medium">模型: <span className="text-slate-700 font-bold">{task.model}</span></p>
               <span className="w-1 h-1 rounded-full bg-slate-300"></span>
               <p className="text-slate-400 text-xs font-medium">任务ID: <span className="text-slate-700 font-mono font-bold">{task.id}</span></p>
            </div>
          </div>
          <button 
            onClick={onViewDetails}
            className="group flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-blue-600 transition-all font-bold text-sm active:scale-95"
          >
            <ExternalLink className="w-4 h-4 group-hover:rotate-12 transition-transform" /> 查看运行追踪 (View Traces)
          </button>
        </div>

        {/* Top KPIs Grid */}
        <div className="grid grid-cols-4 gap-6">
          {[
            { label: 'Total Samples', value: task.totalCases, sub: '指令总数' },
            { label: 'Pass Rate', value: `${task.passRate}%`, sub: '通过率 (>=1.0)', color: task.passRate >= 90 ? 'text-green-600' : 'text-yellow-600' },
            { label: 'Average Score', value: task.avgScore, sub: '平均得分 / 2.0' },
            { label: 'Eval Mode', value: isSingle ? 'Debug' : 'Benchmark', sub: isSingle ? '单样本调试' : '基准测试', icon: isSingle ? Target : Layers }
          ].map((kpi, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{kpi.label}</div>
              <div className={`text-3xl font-black tracking-tighter ${kpi.color || 'text-slate-800'} flex items-center gap-2`}>
                {kpi.icon && <kpi.icon size={20} className="text-blue-500 opacity-50" />}
                {kpi.value}
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-1">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Classification Breakdown Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              {isSingle ? '单样本能力维度判定' : '核心能力维度评估分布'}
            </h3>
            {!isSingle && (
              <div className="flex items-center gap-5 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
                 <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase"><div className="w-2 h-2 bg-green-500 rounded-full"/> 优质</div>
                 <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase"><div className="w-2 h-2 bg-yellow-400 rounded-full"/> 可用</div>
                 <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase"><div className="w-2 h-2 bg-red-500 rounded-full"/> 失败</div>
              </div>
            )}
          </div>

          <div className={`grid ${isSingle ? 'grid-cols-1 max-w-2xl' : 'grid-cols-2'} gap-6`}>
            {displayStats.map((stat) => (
              <div 
                key={stat.name} 
                className={`bg-white p-8 rounded-[2rem] border transition-all duration-300 group ${
                  isSingle 
                  ? 'border-blue-200 shadow-2xl shadow-blue-500/10 bg-gradient-to-br from-white to-blue-50/30' 
                  : 'border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/50'
                }`}
              >
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full shadow-inner ring-4 ring-offset-2 ring-transparent group-hover:ring-slate-100 transition-all ${CATEGORY_COLORS[stat.name]}`} />
                    <div>
                      <h4 className="font-black text-slate-800 text-lg tracking-tight">{stat.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Samples: {stat.count}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Sub-Score</span>
                    <div className="text-xl font-black text-slate-700 tabular-nums">
                      {stat.score.toFixed(1)} <span className="text-xs text-slate-300 font-bold tracking-normal">/ 2.0</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div className="w-full h-5 flex rounded-full overflow-hidden bg-slate-100/50 shadow-inner p-1">
                    {isSingle ? (
                      <div className={`h-full w-full rounded-full transition-all duration-1000 ${
                        stat.excellent > 0 ? 'bg-green-500' : stat.acceptable > 0 ? 'bg-yellow-400' : 'bg-red-500'
                      }`} />
                    ) : (
                      <>
                        <div className="h-full bg-green-500 transition-all duration-700 rounded-l-full" style={{width: `${stat.excellent}%`}} />
                        <div className="h-full bg-yellow-400 transition-all duration-700" style={{width: `${stat.acceptable}%`}} />
                        <div className="h-full bg-red-500 transition-all duration-700 rounded-r-full" style={{width: `${stat.fail}%`}} />
                      </>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-tighter">
                     {isSingle ? (
                       <div className="flex items-center gap-3 w-full">
                          <span className="text-slate-400">Final Verdict:</span>
                          <div className={`flex-1 py-1.5 rounded-xl border text-center transition-colors ${
                            stat.excellent > 0 ? 'bg-green-50 text-green-600 border-green-100' : 
                            stat.acceptable > 0 ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 
                            'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            {stat.excellent > 0 ? 'EXCELLENT' : stat.acceptable > 0 ? 'ACCEPTABLE' : 'FAILED'}
                          </div>
                       </div>
                     ) : (
                       <>
                        <div className="flex items-center gap-2"><span className="text-slate-300">EXC:</span> <span className="text-green-600">{stat.excellent}%</span></div>
                        <div className="flex items-center gap-2"><span className="text-slate-300">ACC:</span> <span className="text-yellow-600">{stat.acceptable}%</span></div>
                        <div className="flex items-center gap-2"><span className="text-slate-300">FAIL:</span> <span className="text-red-600">{stat.fail}%</span></div>
                       </>
                     )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
