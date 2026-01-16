
import React, { useState, useEffect } from 'react';
import { 
  Search, Edit3, Code, Database, MessageSquare, CheckCircle2, AlertCircle, XCircle,
  ChevronDown, ChevronRight, ChevronLeft, FolderOpen, Terminal, Activity, Save, X, FileCode, Info, Bug, Star, MessageSquareQuote
} from 'lucide-react';
import { TestCase, ScoreLevel, EvalTask } from '../types';
import { CATEGORY_COLORS } from '../constants';

// --- UTILITY SUB-COMPONENTS ---

const ScoreDot = ({ score }: { score?: ScoreLevel }) => {
  const colors = { 2: 'bg-green-500', 1: 'bg-yellow-500', 0: 'bg-red-500' };
  return <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colors[score ?? 0]}`} />;
};

const StatusBadge = ({ score }: { score?: ScoreLevel }) => {
  const s = score ?? 0;
  if (s === 2) return <span className="flex items-center text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full border border-green-200 shrink-0"><CheckCircle2 className="w-3 h-3 mr-1" /> 优质</span>;
  if (s === 1) return <span className="flex items-center text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full border border-yellow-200 shrink-0"><AlertCircle className="w-3 h-3 mr-1" /> 可用</span>;
  return <span className="flex items-center text-[10px] font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full border border-red-200 shrink-0"><XCircle className="w-3 h-3 mr-1" /> 不可用</span>;
};

const JsonView = ({ data, theme = 'light' }: { data: any, theme?: 'light' | 'dark' }) => {
  let content = "{}";
  try {
    content = typeof data === 'string' ? data : JSON.stringify(data || {}, null, 2);
  } catch (e) { content = "Error parsing data"; }
  const styles = theme === 'dark' ? 'bg-slate-900 text-blue-300 border-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <div className={`text-[10px] font-mono p-3 rounded-xl border ${styles} overflow-x-auto max-h-[300px] leading-relaxed custom-scrollbar shadow-inner group relative`}>
      <pre className="whitespace-pre-wrap break-all">{content}</pre>
    </div>
  );
};

// --- CORE: TRACE STEP ITEM (3-COLUMN) ---

interface TraceStepItemProps {
  step: any;
  idx: number;
  isEditing: boolean;
  editValue: string;
  onEditChange: (val: string) => void;
}

const TraceStepItem = ({ step, idx, isEditing, editValue, onEditChange }: TraceStepItemProps) => {
  if (!step) return null;
  const isFaulty = (step?.score ?? 2) < 2;

  const parseComment = (comment: string) => {
    try {
      // The simulated response generates stringified JSON in the comment field
      return JSON.parse(comment);
    } catch (e) {
      return { score: null, reason: comment };
    }
  };

  return (
    <div className="relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Icon & Label */}
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${
          step?.score === 2 ? 'bg-green-50 border-green-200 text-green-600' : 
          step?.score === 1 ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {step?.type === 'orchestration' ? <Code size={20} /> : step?.type === 'tool' ? <Database size={20} /> : <MessageSquare size={20} />}
        </div>
        <div>
          <h4 className="font-black text-[11px] text-slate-500 uppercase tracking-widest">Step {idx + 1}: {step?.name || 'Operation'}</h4>
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Module: {step?.type || 'N/A'}</span>
        </div>
      </div>

      {/* 3-Column Content Box */}
      <div className={`grid grid-cols-12 rounded-3xl border-2 overflow-hidden shadow-xl transition-all duration-300 ${isFaulty && !isEditing ? 'border-red-200 ring-4 ring-red-50/50' : 'border-slate-100 bg-white'}`}>
        
        {/* Col 1: Actual Output (35%) */}
        <div className="col-span-4 bg-slate-900 p-5 border-r border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4 text-[9px] font-black text-blue-400/60 tracking-widest uppercase">
            <span className="flex items-center gap-2"><Activity size={12}/> Agent Output</span>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <JsonView data={step?.actual} theme="dark" />
        </div>

        {/* Col 2: Ground Truth / Expected (35%) */}
        <div className="col-span-4 bg-white p-5 border-r border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4 text-[9px] font-black text-slate-400 tracking-widest uppercase">
            <span>Ground Truth</span>
            {!isEditing && <StatusBadge score={step?.score} />}
          </div>
          <div className={`flex-1 flex flex-col rounded-xl transition-all duration-300 ${isEditing ? 'ring-2 ring-blue-500 bg-blue-50/20' : ''}`}>
            {isEditing ? (
              <textarea 
                value={editValue || ""}
                onChange={(e) => onEditChange(e.target.value)}
                className="w-full flex-1 p-3 text-[10px] font-mono border-0 bg-transparent outline-none resize-none custom-scrollbar leading-relaxed"
                placeholder="Edit JSON..."
              />
            ) : (
              <JsonView data={step?.expected} />
            )}
          </div>
        </div>

        {/* Col 3: Dimension Metrics (30%) - REFINED FOR JSON PARSING */}
        <div className="col-span-4 bg-slate-50/40 p-5 flex flex-col">
          <div className="text-[9px] font-black text-slate-400 tracking-widest uppercase mb-5 flex items-center gap-1.5">
            <Star size={12} className="text-yellow-500 fill-yellow-500" /> Dimension Analysis
          </div>
          <div className="space-y-6 flex-1">
            {step?.dimensions?.length > 0 ? (
              step.dimensions.map((d: any, i: number) => {
                const parsed = parseComment(d.comment);
                const scoreValue = parsed.score ?? d.score;
                const reasonText = parsed.reason || d.comment;

                return (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{d?.name || 'Metric'}</span>
                      <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${
                        scoreValue === 2 ? 'bg-green-50 text-green-600' : 
                        scoreValue === 1 ? 'bg-yellow-50 text-yellow-600' : 
                        'bg-red-50 text-red-600'
                      }`}>
                        {scoreValue === 2 ? '优质 (2分)' : scoreValue === 1 ? '可用 (1分)' : '不可用 (0分)'}
                      </span>
                    </div>

                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-700 ease-out ${
                          scoreValue === 2 ? 'bg-green-500' : scoreValue === 1 ? 'bg-yellow-400' : 'bg-red-500'
                        }`}
                        style={{ width: scoreValue === 2 ? '100%' : scoreValue === 1 ? '50%' : '15%' }}
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-50">
                       <div className="flex items-start gap-1.5">
                          <MessageSquareQuote size={12} className="text-blue-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                            {reasonText}
                          </p>
                       </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 opacity-30 py-10">
                <Bug size={32} />
                <span className="text-[9px] font-black mt-2">NO METRIC DATA</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN CASE EXPLORER COMPONENT ---

export interface CaseExplorerProps {
  currentTask: EvalTask;
  allTasks: EvalTask[];
  allCases: TestCase[];
  initialSelectedCaseId?: string;
  onUpdateCase: (updatedCase: TestCase) => void;
  onBack: () => void;
}

export const CaseExplorer: React.FC<CaseExplorerProps> = ({ 
  currentTask, 
  allTasks = [], 
  allCases = [], 
  initialSelectedCaseId, 
  onUpdateCase,
  onBack 
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialSelectedCaseId || '');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set([currentTask?.id || '']));
  const [isEditing, setIsEditing] = useState(false);
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [editedStepsData, setEditedStepsData] = useState<string[]>([]);

  const selectedCase = allCases.find(c => c.id === selectedCaseId);
  const taskCases = allCases.filter(c => c?.taskId === currentTask?.id);

  useEffect(() => {
    if (!selectedCaseId && taskCases.length > 0) setSelectedCaseId(taskCases[0]?.id || '');
  }, [taskCases, selectedCaseId]);

  useEffect(() => {
    if (selectedCase?.steps) {
      setEditedStepsData(selectedCase.steps.map(s => {
        try { return JSON.stringify(s.expected || {}, null, 2); } catch (e) { return "{}"; }
      }));
    }
  }, [selectedCaseId, isEditing, selectedCase]);

  const handleSave = () => {
    if (!selectedCase) return;
    const updatedSteps = (selectedCase.steps || []).map((step, idx) => {
      let newExp = step.expected;
      try { newExp = JSON.parse(editedStepsData[idx] || "{}"); } catch (e) {}
      return { ...step, expected: newExp };
    });
    onUpdateCase({ ...selectedCase, steps: updatedSteps });
    setIsEditing(false);
  };

  if (!selectedCase) return (
    <div className="flex flex-col items-center justify-center h-full text-slate-300 bg-slate-50 gap-4">
      <Bug size={64} className="opacity-10 animate-pulse" />
      <span className="font-bold text-lg">Select a test case to start inspection</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden font-sans">
      <div className="px-8 py-4 bg-white border-b border-slate-200 flex items-center gap-3 shrink-0">
        <button 
          onClick={onBack} 
          className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition text-sm font-medium"
        >
          <ChevronLeft size={16} /> 任务列表
        </button>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="text-slate-900 font-bold text-lg tracking-tight">{currentTask?.name || 'Loading Task...'}</span>
        <ChevronRight size={14} className="text-slate-300" />
        <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-sm font-medium">
          详情 Explorer
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-hidden shadow-inner">
          <div className="p-4 bg-white border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input type="text" placeholder="Search Query..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:ring-1 focus:ring-blue-500 shadow-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {allTasks.map(task => (
              <div key={task?.id} className="space-y-1">
                <button onClick={() => {
                  const ns = new Set(expandedTasks);
                  if (ns.has(task.id)) ns.delete(task.id); else ns.add(task.id);
                  setExpandedTasks(ns);
                }} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition text-left ${task?.id === currentTask?.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-200/50'}`}>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FolderOpen size={14} /> <span className="text-xs font-bold truncate">{task?.name || 'Task'}</span>
                  </div>
                  {expandedTasks.has(task.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {expandedTasks.has(task.id) && (
                  <div className="ml-4 pl-2 border-l border-slate-200 space-y-1 py-1">
                    {allCases.filter(c => c.taskId === task.id).map(c => (
                      <div key={c.id} onClick={() => setSelectedCaseId(c.id)} className={`p-2 rounded-md cursor-pointer border transition flex items-start gap-2 ${selectedCaseId === c.id ? 'bg-white border-blue-400 text-blue-700 shadow-md ring-1 ring-blue-500/10' : 'text-slate-500 hover:bg-white hover:border-slate-200'}`}>
                        <ScoreDot score={c?.status} /> <div className="text-[11px] font-bold line-clamp-2 leading-relaxed">{c?.query || 'N/A'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-slate-50/10 overflow-hidden">
          {/* CONTENT HEADER */}
          <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-20">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Case Analysis</span>
                <span className="font-bold text-slate-800 text-lg flex items-center gap-2 tracking-tight">
                  <Terminal size={18} className="text-blue-600"/> {selectedCase.id}
                </span>
              </div>
              <div className={`text-[10px] px-2.5 py-1 rounded text-white font-black tracking-tighter ${CATEGORY_COLORS[selectedCase.category] || 'bg-slate-500'}`}>
                {selectedCase.category}
              </div>
              <StatusBadge score={selectedCase.status} />
            </div>
            <div className="flex items-center gap-3">
              {isEditing && (
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition active:scale-95">Cancel</button>
              )}
              <button 
                onClick={() => isEditing ? handleSave() : setIsEditing(true)} 
                className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-xs shadow-lg transition active:scale-95 ${isEditing ? 'bg-green-600 text-white shadow-green-900/10' : 'bg-white border border-slate-200 text-slate-600'}`}
              >
                {isEditing ? <Save size={14}/> : <Edit3 size={14}/>} {isEditing ? 'Save Corrections' : 'Correct Ground Truth'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-12 pb-12">
              
              <div className="grid grid-cols-12 gap-8 items-start">
                <div className="col-span-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 group">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase mb-5 flex items-center gap-2 tracking-widest group-hover:text-blue-500 transition"><MessageSquare size={16} /> Parsed User Instruction</h3>
                  <div className="text-xl text-slate-800 font-black italic bg-slate-50 p-6 rounded-2xl border border-slate-100 min-h-[100px] flex items-center">
                    "{selectedCase.query || 'N/A'}"
                  </div>
                </div>
                <div className="col-span-4 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col group hover:shadow-md transition-all">
                  <button onClick={() => setIsLogExpanded(!isLogExpanded)} className="w-full px-6 py-6 flex items-center justify-between bg-slate-50/50 hover:bg-slate-100 transition border-b border-slate-100">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><FileCode size={16} /> Raw Log Detail</span>
                    {isLogExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isLogExpanded ? 'max-h-[400px]' : 'max-h-0'}`}>
                    <div className="p-5 bg-slate-900 text-blue-300 font-mono text-[9px] overflow-auto max-h-[350px] leading-relaxed custom-scrollbar border-t border-slate-800">
                      {selectedCase.rawLog || 'No log recorded.'}
                    </div>
                  </div>
                  {!isLogExpanded && (
                    <div className="p-10 flex flex-col items-center justify-center text-slate-300 opacity-20">
                      <Info size={32} />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-20 py-4 relative">
                <div className="absolute left-[20px] top-[20px] bottom-[20px] w-0.5 bg-slate-100 hidden md:block" />
                
                {(selectedCase.steps || []).map((step, idx) => (
                  <TraceStepItem 
                    key={idx} 
                    step={step} 
                    idx={idx} 
                    isEditing={isEditing}
                    editValue={editedStepsData[idx]}
                    onEditChange={(val) => {
                      const nd = [...editedStepsData];
                      nd[idx] = val;
                      setEditedStepsData(nd);
                    }}
                  />
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all group">
                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-5 tracking-widest flex items-center gap-2 group-hover:text-blue-500 transition">
                  <CheckCircle2 size={16} /> AI Judge Final Commentary
                </h3>
                <p className={`p-8 rounded-2xl border-2 text-sm font-bold leading-loose shadow-inner ${selectedCase.status === 2 ? 'bg-green-50 text-green-900 border-green-100' : 'bg-red-50 text-red-900 border-red-100'}`}>
                  {selectedCase.judgeComment || "Final report pending."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
