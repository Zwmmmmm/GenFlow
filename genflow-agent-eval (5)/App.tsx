
import React, { useState } from 'react';
import { 
  BarChart3, 
  Settings, 
  Plus, 
  Activity,
  ChevronRight,
  LayoutDashboard,
  FileSearch
} from 'lucide-react';
import { ScoreLevel, ViewMode, CategoryType, EvalTask, TestCase, EvalDimension } from './types';
import { INITIAL_DIMENSIONS, MOCK_TASKS_DATA, MOCK_CASES_DATA, GLOBAL_METRIC_CONFIGS, MetricConfig } from './constants';
import { TaskDashboard } from './components/TaskDashboard';
import { CaseExplorer } from './components/CaseExplorer';
import { SettingsPanel } from './components/SettingsPanel';
import { NewEvalModal, NewEvalConfig, GroundTruthData } from './components/NewEvalModal';

/**
 * UTILITY: Human Readable Query Extractor
 */
const extractHumanQuery = (input: string): string => {
  if (!input) return "Empty Input";
  try {
    const data = JSON.parse(input);
    const findText = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const res = findText(item);
          if (res) return res;
        }
        return null;
      }
      const priorityKeys = ['query', 'raw_query', 'content', 'text', 'input', 'prompt'];
      for (const key of priorityKeys) {
        if (typeof obj[key] === 'string' && obj[key].trim().length > 0) {
          if (obj[key].trim().startsWith('{')) continue;
          return obj[key];
        }
      }
      return null;
    };
    const extracted = findText(data);
    if (extracted) return extracted;
  } catch (e) {}
  return input.length > 60 ? input.slice(0, 60) + "..." : input;
};

const parseCSV = (csvData: string): { query: string; groundTruth?: GroundTruthData; rawLog?: string }[] => {
  const lines = csvData.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
    const entry: any = { query: '', groundTruth: {} };
    headers.forEach((header, idx) => {
      const val = values[idx];
      if (!val) return;
      if (header.match(/query|指令/)) entry.query = val;
      else if (header.match(/log|日志|actual_log/)) entry.rawLog = val;
      else if (header.match(/correct_tool|正确工具|预期工具|expected_tool/)) entry.groundTruth.tool = val;
      else if (header.match(/correct_args|正确参数|预期参数|expected_args/)) {
        try { entry.groundTruth.args = JSON.parse(val); } catch (e) { entry.groundTruth.args = val; }
      }
    });
    return entry;
  });
};

// --- REFACTORED: Evaluation Simulation Logic for System Prompts ---
const simulateEvaluation = (
  inputs: (string | { query: string; groundTruth?: GroundTruthData; rawLog?: string })[],
  taskId: string,
  currentMetrics: MetricConfig[] = GLOBAL_METRIC_CONFIGS,
  globalManualGT?: GroundTruthData
): TestCase[] => {
  return inputs.map((input, index) => {
    const caseId = `CASE-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    let query = "";
    let activeGT: GroundTruthData | undefined = undefined;
    let rawLogDisplay = "";

    if (typeof input === 'string') {
      query = extractHumanQuery(input);
      activeGT = globalManualGT;
      rawLogDisplay = input;
    } else {
      query = input.query;
      activeGT = input.groundTruth || globalManualGT;
      rawLogDisplay = input.rawLog || JSON.stringify(input);
    }

    const rand = Math.random();
    let overallStatus: ScoreLevel = rand > 0.45 ? 2 : rand > 0.15 ? 1 : 0;

    const getExpectedData = (stepType: string) => {
      if (activeGT) {
        if (stepType === 'orchestration' && activeGT.intent) return { intent: activeGT.intent, status: 'verified' };
        if (stepType === 'tool' && (activeGT.tool || activeGT.args)) {
          let argsObj = {};
          try { 
            argsObj = typeof activeGT.args === 'string' ? JSON.parse(activeGT.args || '{}') : activeGT.args || {}; 
          } catch(e) { argsObj = { error: "Invalid JSON" }; }
          return { tool: activeGT.tool, args: argsObj, status: 'verified' };
        }
      }
      return stepType === 'orchestration' ? { intent: "auto_detect", priority: "high" } : { tool: "internal_search", args: { q: query } };
    };

    const generateStepDimensions = (stepType: string, stepScore: ScoreLevel, actualData: any, expectedData: any) => {
      const relevantConfigs = currentMetrics.filter(m => m.targetStep === stepType);
      return relevantConfigs.map(config => {
        let score: ScoreLevel = stepScore;
        if (activeGT) {
          if (stepType === 'orchestration' && activeGT.intent && actualData.intent !== expectedData.intent) score = 0;
          if (stepType === 'tool' && activeGT.tool && actualData.tool !== expectedData.tool) score = 0;
        }
        
        // Generate Mock Comment based on System Prompt presence
        let comment = "";
        if (score === 2) comment = `通过维度 [${config.name}] 审计：表现优异，完全符合 System Prompt 设定的预期目标。`;
        else if (score === 1) comment = `通过维度 [${config.name}] 审计：基本达标，但在部分细节上未能完美遵循提示词指令。`;
        else comment = `通过维度 [${config.name}] 审计：识别到严重偏离，与 System Prompt 要求的标准不符。`;

        return { name: config.name, score, comment };
      });
    };

    const steps: TestCase['steps'] = [
      { name: "意图编排 (Orchestration)", type: "orchestration", score: overallStatus, expected: getExpectedData('orchestration'), actual: { intent: "auto_detect" }, dimensions: generateStepDimensions('orchestration', overallStatus, { intent: "auto_detect" }, getExpectedData('orchestration')) },
      { name: "工具执行 (Tool Call)", type: "tool", score: overallStatus === 2 ? 2 : 1, expected: getExpectedData('tool'), actual: { tool: "internal_search" }, dimensions: generateStepDimensions('tool', overallStatus === 2 ? 2 : 1, { tool: "internal_search" }, getExpectedData('tool')) },
      { name: "总结回复 (Response)", type: "response", score: overallStatus, expected: { format: "markdown" }, actual: { format: "markdown" }, dimensions: generateStepDimensions('response', overallStatus, {}, {}) }
    ];

    const categories: CategoryType[] = ['简单基础任务', '复杂推理任务', '多轮对话与澄清', '模糊与鲁棒性'];
    return {
      id: caseId, taskId, query, rawLog: rawLogDisplay, category: categories[index % 4], status: overallStatus, tags: [activeGT?.tool ? "#GroundTruth" : "#Simulated"], judgeComment: overallStatus === 2 ? "✅ 逻辑严密。" : "⚠️ 偏差。", dimensionScores: [], steps
    };
  });
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('taskList');
  const [tasks, setTasks] = useState<EvalTask[]>(MOCK_TASKS_DATA);
  const [cases, setCases] = useState<TestCase[]>(MOCK_CASES_DATA);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(MOCK_TASKS_DATA[0].id);
  const [dimensions, setDimensions] = useState<MetricConfig[]>(GLOBAL_METRIC_CONFIGS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentTask = tasks.find(t => t.id === currentTaskId) || tasks[0];

  const handleRunEval = (config: NewEvalConfig) => {
    const newTaskId = `TASK-${Date.now()}`;
    let inputPayload: any[] = [];
    if (config.inputType === 'batch' && typeof config.data === 'string') {
      const dataStr = config.data.trim();
      if (dataStr.startsWith('[') || dataStr.startsWith('{')) {
        try {
          const parsed = JSON.parse(dataStr);
          inputPayload = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) { alert("JSON 数据解析失败。"); return; }
      } else {
        inputPayload = parseCSV(dataStr);
        if (inputPayload.length === 0) { alert("CSV 解析失败。"); return; }
      }
    } else { inputPayload = [config.data || "Empty Query"]; }

    const newTask: EvalTask = {
      id: newTaskId, name: config.name, model: config.model, date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      totalCases: inputPayload.length, passRate: 0, avgScore: "0.0", status: 'running',
      categoryStats: { '简单基础任务': { excellent: 0, acceptable: 0, fail: 0, score: 0 }, '复杂推理任务': { excellent: 0, acceptable: 0, fail: 0, score: 0 }, '多轮对话与澄清': { excellent: 0, acceptable: 0, fail: 0, score: 0 }, '模糊与鲁棒性': { excellent: 0, acceptable: 0, fail: 0, score: 0 } }
    };
    setTasks([newTask, ...tasks]);
    setIsModalOpen(false);
    setTimeout(() => {
      const generatedCases = simulateEvaluation(inputPayload, newTaskId, dimensions, config.expectedData);
      const successCount = generatedCases.filter(c => c.status >= 1).length;
      const totalScore = generatedCases.reduce((acc, c) => acc + c.status, 0);
      const updatedTask: EvalTask = { ...newTask, status: 'completed', passRate: Math.round((successCount / generatedCases.length) * 100), avgScore: (totalScore / generatedCases.length).toFixed(1) };
      setTasks(prev => prev.map(t => t.id === newTaskId ? updatedTask : t));
      setCases(prev => [...generatedCases, ...prev]);
      setCurrentTaskId(newTaskId);
      setView('taskDashboard');
    }, 1200);
  };

  const handleUpdateCase = (updated: TestCase) => setCases(prev => prev.map(c => c.id === updated.id ? updated : c));

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <aside className="w-20 bg-slate-900 flex flex-col items-center py-6 gap-8 shadow-2xl z-30">
        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4"><Activity className="text-white w-6 h-6" /></div>
        <nav className="flex flex-col gap-4">
          {[
            { id: 'taskList', icon: LayoutDashboard, label: '任务列表' },
            { id: 'caseExplorer', icon: FileSearch, label: '详情追溯' },
            { id: 'settings', icon: Settings, label: '评估配置' }
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id as ViewMode)} className={`p-3 rounded-xl transition-all relative group ${view === item.id ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}><item.icon size={22} /></button>
          ))}
        </nav>
        <button onClick={() => setIsModalOpen(true)} className="mt-auto p-3 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-inner"><Plus size={22} /></button>
      </aside>
      <main className="flex-1 overflow-hidden flex flex-col">
        {view === 'taskList' && (
          <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
            <header className="flex justify-between items-end mb-8">
              <div><h1 className="text-3xl font-black text-slate-800 tracking-tight">评测任务列表</h1><p className="text-slate-500 font-medium">管理您的 Agent 评测任务进度与报告。</p></div>
              <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition font-bold"><Plus size={18} /> 新建评测</button>
            </header>
            <div className="grid grid-cols-1 gap-4">{tasks.map(task => (
              <div key={task.id} onClick={() => { setCurrentTaskId(task.id); setView('taskDashboard'); }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex items-center justify-between">
                <div className="flex items-center gap-6"><div className={`w-12 h-12 rounded-xl flex items-center justify-center ${task.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>{task.status === 'completed' ? <BarChart3 size={24} /> : <Activity size={24} className="animate-pulse" />}</div><div><h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition">{task.name}</h3><div className="flex gap-4 text-xs text-slate-400 mt-1 font-medium"><span>Model: {task.model}</span><span>Date: {task.date}</span></div></div></div>
                <div className="flex items-center gap-10"><div className="text-right"><div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Pass Rate</div><div className={`text-xl font-black ${task.passRate >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>{task.passRate}%</div></div><ChevronRight className="text-slate-300 group-hover:text-blue-500 transition translate-x-0 group-hover:translate-x-1" /></div>
              </div>
            ))}</div>
          </div>
        )}
        {view === 'taskDashboard' && currentTask && <TaskDashboard task={currentTask} allCases={cases} onViewDetails={() => setView('caseExplorer')} />}
        {view === 'caseExplorer' && currentTask && (
          <CaseExplorer 
            currentTask={currentTask} 
            allTasks={tasks} 
            allCases={cases} 
            onUpdateCase={handleUpdateCase} 
            onBack={() => setView('taskList')} 
          />
        )}
        {view === 'settings' && <SettingsPanel dimensions={dimensions} onUpdateDimensions={setDimensions} />}
      </main>
      <NewEvalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onRun={handleRunEval} availableDimensions={dimensions} />
    </div>
  );
};

export default App;
