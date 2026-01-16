
import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  MessageSquare, 
  ChevronDown, 
  ChevronRight, 
  Play, 
  Settings2,
  ChevronUp,
  Target,
  Database,
  Code,
  FileSpreadsheet,
  Download,
  Info
} from 'lucide-react';
import { EvalDimension } from '../types';

interface NewEvalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (config: NewEvalConfig) => void;
  availableDimensions: EvalDimension[];
}

export interface GroundTruthData {
  intent?: string;
  tool?: string;
  args?: string | object;
}

export interface NewEvalConfig {
  name: string;
  model: string;
  inputType: 'single' | 'batch';
  data: string | File | null;
  selectedDimensions: string[];
  expectedData?: GroundTruthData;
}

export const NewEvalModal: React.FC<NewEvalModalProps> = ({ isOpen, onClose, onRun, availableDimensions }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [showGroundTruth, setShowGroundTruth] = useState(false);
  const [config, setConfig] = useState<NewEvalConfig>({
    name: `Eval_Task_${new Date().toISOString().slice(0, 10)}`,
    model: 'GenFlow-Pro-v2.1',
    inputType: 'single',
    data: null,
    selectedDimensions: availableDimensions.map(d => d.id),
    expectedData: { tool: '', args: '' }
  });
  const [textInput, setTextInput] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setConfig({ ...config, data: content });
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = () => {
    onRun({ ...config, data: config.inputType === 'single' ? textInput : config.data });
    setStep(1);
    setTextInput('');
    setConfig(prev => ({...prev, data: null, expectedData: { tool: '', args: '' }}));
    setShowGroundTruth(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">运行新评测 (New Evaluation)</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Step {step} of 2</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => setConfig({ ...config, inputType: 'single' })}
                  className={`cursor-pointer p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-center ${config.inputType === 'single' ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-100' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}
                >
                  <MessageSquare className={`w-8 h-8 ${config.inputType === 'single' ? 'text-blue-600' : 'text-slate-300'}`} />
                  <div>
                    <div className="font-bold text-slate-700">单条调试 (Debug)</div>
                    <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Paste JSON Logs</div>
                  </div>
                </div>
                <div 
                  onClick={() => setConfig({ ...config, inputType: 'batch' })}
                  className={`cursor-pointer p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-center ${config.inputType === 'batch' ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-100' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}
                >
                  <Upload className={`w-8 h-8 ${config.inputType === 'batch' ? 'text-blue-600' : 'text-slate-300'}`} />
                  <div>
                    <div className="font-bold text-slate-700">批量上传 (Batch)</div>
                    <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">CSV / Excel Upload</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">
                  {config.inputType === 'single' ? '输入测试日志内容' : '上传数据集文件'}
                </label>
                {config.inputType === 'single' ? (
                  <textarea 
                    className="w-full h-32 p-4 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-slate-50/30"
                    placeholder='{"query": "帮我搜索上周的会议纪要"}'
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />
                ) : (
                  <div className="space-y-4">
                    <label className="w-full h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 hover:bg-slate-100 hover:border-blue-300 transition-all cursor-pointer">
                      <input type="file" accept=".csv,.json,.xlsx" className="hidden" onChange={handleFileChange} />
                      <Upload size={24} className="mb-2" />
                      <span className="text-xs font-bold">{config.data ? '文件已准备就绪' : '点击上传 .csv / .xlsx 文件'}</span>
                      <span className="text-[10px] mt-1 opacity-60 italic text-center px-4">支持直接上传 Excel 导出的 CSV 文件。系统将自动识别表头进行评测。</span>
                    </label>

                    {/* BLOCK 1: Visual Table Header Guide */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-green-600" />
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">批量上传表头规范 (Standard Headers)</span>
                        </div>
                        <button className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-tighter transition">
                          <Download size={12} /> 下载 CSV 模板
                        </button>
                      </div>
                      <div className="p-0 overflow-x-auto">
                        <table className="w-full text-[10px] text-left">
                          <thead className="bg-slate-100 text-slate-400 font-black uppercase tracking-widest border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2 border-r border-slate-200">Query (必填)</th>
                              <th className="px-4 py-2 border-r border-slate-200">Log (选填)</th>
                              <th className="px-4 py-2 border-r border-slate-200">Correct Tool</th>
                              <th className="px-4 py-2">Correct Args</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                            <tr>
                              <td className="px-4 py-2 border-r border-slate-100">帮我找文件</td>
                              <td className="px-4 py-2 border-r border-slate-100 text-slate-300 italic">(空)</td>
                              <td className="px-4 py-2 border-r border-slate-100">search_file</td>
                              <td className="px-4 py-2 font-mono text-[9px]">{"{"}"q":"文件"{"}"}</td>
                            </tr>
                            <tr className="bg-slate-50/30">
                              <td className="px-4 py-2 border-r border-slate-100">查天气</td>
                              <td className="px-4 py-2 border-r border-slate-100 text-[8px] font-mono text-slate-400">host=10.1.x...</td>
                              <td className="px-4 py-2 border-r border-slate-100 text-slate-300 italic">(空)</td>
                              <td className="px-4 py-2 text-slate-300 italic">(空)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                        <Info size={12} className="text-blue-500" />
                        <span className="text-[9px] text-slate-400 font-medium">若提供 Log 则优先进行日志评估，否则系统将模拟运行产生新日志。</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {config.inputType === 'single' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setShowGroundTruth(!showGroundTruth)}
                    className="w-full px-4 py-3 bg-slate-50/80 flex items-center justify-between hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center gap-2 text-slate-700">
                      <Target size={16} className="text-blue-600" />
                      <span className="text-xs font-bold">设置预期结果 / Ground Truth</span>
                    </div>
                    {showGroundTruth ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showGroundTruth && (
                    <div className="p-4 bg-white border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">预期编排/工具 (Expected Tool)</label>
                          <input 
                            type="text" 
                            placeholder="例如: cloud_search (人工标注的理想工具名称)"
                            className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={config.expectedData?.tool}
                            onChange={e => setConfig({...config, expectedData: {...config.expectedData!, tool: e.target.value}})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">预期参数 (Expected Args)</label>
                          <textarea 
                            placeholder="例如: { keyword: '会议纪要' }"
                            className="w-full h-20 p-3 text-xs font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-slate-50/20"
                            value={typeof config.expectedData?.args === 'string' ? config.expectedData.args : JSON.stringify(config.expectedData?.args || {})}
                            onChange={e => setConfig({...config, expectedData: {...config.expectedData!, args: e.target.value}})}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">任务名称</label>
                   <input 
                      type="text" 
                      value={config.name}
                      onChange={(e) => setConfig({...config, name: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">选择模型</label>
                   <select 
                      value={config.model}
                      onChange={(e) => setConfig({...config, model: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                   >
                     <option>GenFlow-Pro-v2.1</option>
                     <option>GenFlow-Standard-v1</option>
                   </select>
                 </div>
              </div>

              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                   <Settings2 size={14} /> 维度开关 (Active Metrics)
                 </label>
                 <div className="border border-slate-100 rounded-2xl divide-y divide-slate-50 max-h-48 overflow-y-auto custom-scrollbar bg-slate-50/20">
                    {availableDimensions.map(dim => (
                      <div key={dim.id} className="flex items-center gap-4 p-4 hover:bg-white transition group">
                         <input 
                           type="checkbox" 
                           className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition-all cursor-pointer"
                           checked={config.selectedDimensions.includes(dim.id)}
                           onChange={(e) => {
                             if(e.target.checked) setConfig({...config, selectedDimensions: [...config.selectedDimensions, dim.id]});
                             else setConfig({...config, selectedDimensions: config.selectedDimensions.filter(id => id !== dim.id)});
                           }}
                         />
                         <div className="cursor-pointer flex-1" onClick={() => {
                            const active = config.selectedDimensions.includes(dim.id);
                            if(!active) setConfig({...config, selectedDimensions: [...config.selectedDimensions, dim.id]});
                            else setConfig({...config, selectedDimensions: config.selectedDimensions.filter(id => id !== dim.id)});
                         }}>
                            <div className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition">{dim.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{dim.description}</div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
           {step === 2 ? (
             <button onClick={() => setStep(1)} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition">Back</button>
           ) : <div />}
           
           {step === 1 ? (
             <button 
               onClick={() => setStep(2)}
               disabled={config.inputType === 'single' ? !textInput : !config.data}
               className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-30 transition font-bold text-sm shadow-xl shadow-blue-200"
             >
               下一步 <ChevronRight size={16} />
             </button>
           ) : (
             <button onClick={handleSubmit} className="flex items-center gap-2 px-10 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-bold text-sm shadow-xl shadow-green-100">
               <Play size={16} fill="currentColor" /> 开始运行
             </button>
           )}
        </div>
      </div>
    </div>
  );
};
