
import React, { useState } from 'react';
import { 
  Database, 
  Cpu, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Target, 
  Microscope, 
  ShieldCheck, 
  Terminal,
  MessageSquareCode
} from 'lucide-react';
import { MetricConfig } from '../constants';

interface SettingsPanelProps {
  dimensions: MetricConfig[];
  onUpdateDimensions: (dims: MetricConfig[]) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ dimensions, onUpdateDimensions }) => {
  const [activeTab, setActiveTab] = useState<'datasets' | 'prompts' | 'dimensions'>('dimensions');
  const [isAddingDim, setIsAddingDim] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state updated to reflect single systemPrompt
  const [newDim, setNewDim] = useState<Partial<MetricConfig>>({
    name: '',
    targetStep: 'orchestration',
    method: 'LLM-Judge',
    description: '',
    systemPrompt: ''
  });

  const resetForm = () => {
    setIsAddingDim(false);
    setEditingId(null);
    setNewDim({
      name: '',
      targetStep: 'orchestration',
      method: 'LLM-Judge',
      description: '',
      systemPrompt: ''
    });
  };

  const handleSaveDimension = () => {
    if (!newDim.name || !newDim.systemPrompt) {
      alert("请填写维度名称和评估系统提示词。");
      return;
    }

    if (editingId) {
      const updatedDims = dimensions.map(d => 
        d.id === editingId ? { ...d, ...newDim } as MetricConfig : d
      );
      onUpdateDimensions(updatedDims);
    } else {
      const dim: MetricConfig = {
        ...newDim as MetricConfig,
        id: `m-${Date.now()}`,
        promptTemplate: ''
      };
      onUpdateDimensions([...dimensions, dim]);
    }
    resetForm();
  };

  const handleEdit = (dim: MetricConfig) => {
    setNewDim({
      name: dim.name,
      targetStep: dim.targetStep,
      method: dim.method,
      description: dim.description,
      systemPrompt: dim.systemPrompt
    });
    setEditingId(dim.id);
    setIsAddingDim(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除该评估维度吗？此操作不可撤销。')) {
      onUpdateDimensions(dimensions.filter(d => d.id !== id));
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-32 bg-slate-50/30">
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">设置与资源管理</h1>
          <p className="text-slate-500 font-medium">配置多维评估提示词、管理数据集及 Prompt 资产。</p>
        </header>

        <div className="flex space-x-1 border-b border-slate-200">
          {[
            { id: 'dimensions', label: '评估体系 (Metrics)', icon: Microscope },
            { id: 'datasets', label: '测试集 (Datasets)', icon: Database },
            { id: 'prompts', label: '提示词 (Prompts)', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[500px] overflow-hidden">
          {activeTab === 'dimensions' && (
            <div className="divide-y divide-slate-100">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                     <h3 className="font-bold text-slate-800">
                       {editingId ? '编辑评估维度' : '评估维度配置'}
                     </h3>
                     <p className="text-xs text-slate-500 mt-1">使用 System Prompt 定义该维度的评分逻辑与标准。</p>
                  </div>
                  {!isAddingDim && (
                    <button 
                      onClick={() => setIsAddingDim(true)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                    >
                      <Plus size={14} /> 新增评估维度
                    </button>
                  )}
               </div>
               
               {isAddingDim && (
                 <div className="p-8 bg-blue-50/20 space-y-8 animate-in slide-in-from-top-4 duration-300">
                   <div className="grid grid-cols-12 gap-6">
                     <div className="col-span-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">维度名称</label>
                        <input 
                          type="text" 
                          placeholder="例如: 编排准确率" 
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-white"
                          value={newDim.name}
                          onChange={e => setNewDim({...newDim, name: e.target.value})}
                        />
                     </div>
                     <div className="col-span-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">适用环节</label>
                        <select 
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition"
                          value={newDim.targetStep}
                          onChange={e => setNewDim({...newDim, targetStep: e.target.value as any})}
                        >
                          <option value="orchestration">Orchestration (意图编排)</option>
                          <option value="tool">Tool Call (工具执行)</option>
                          <option value="response">Response (最终回复)</option>
                        </select>
                     </div>
                     <div className="col-span-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">评测方式</label>
                        <select 
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition"
                          value={newDim.method}
                          onChange={e => setNewDim({...newDim, method: e.target.value as any})}
                        >
                          <option value="LLM-Judge">LLM-Judge (智能定性)</option>
                          <option value="Rule-based">Rule-based (确定性校验)</option>
                        </select>
                     </div>
                   </div>

                   {/* System Prompt Configuration Area */}
                   <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                        <Terminal size={16} className="text-blue-500" /> 评估系统提示词 (System Prompt Configuration)
                      </h4>
                      <div className="relative">
                        <textarea 
                          placeholder="输入驱动此维度的评估指令... 例如：你是一个专业的审计员，请根据..."
                          className="w-full h-48 p-4 text-xs font-mono border border-blue-100 rounded-2xl bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none transition leading-relaxed shadow-inner"
                          value={newDim.systemPrompt}
                          onChange={e => setNewDim({...newDim, systemPrompt: e.target.value})}
                        />
                        <div className="absolute right-4 bottom-4 opacity-10 pointer-events-none">
                          <MessageSquareCode size={48} />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">提示：详细的标准定义和评分区间（0-2分）将显著提升评估的准确性。</p>
                   </div>

                   <div className="flex gap-3 justify-end pt-4 border-t border-blue-100">
                     <button onClick={resetForm} className="px-6 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition">取消</button>
                     <button onClick={handleSaveDimension} className="flex items-center gap-2 px-8 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition">
                       <Save size={16} /> {editingId ? '更新配置' : '保存配置'}
                     </button>
                   </div>
                 </div>
               )}

               <div className="divide-y divide-slate-50">
                 {dimensions.map((dim: any) => (
                   <div key={dim.id} className={`p-8 group transition-colors ${editingId === dim.id ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}>
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm text-blue-600 group-hover:scale-110 transition">
                              <Target size={18} />
                            </div>
                            <div>
                               <div className="flex items-center gap-3">
                                  <span className="font-bold text-slate-800 text-lg">{dim.name}</span>
                                  <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">{dim.targetStep}</span>
                               </div>
                               <span className="text-xs text-slate-400 font-medium">评估方式: {dim.method}</span>
                            </div>
                         </div>
                         <div className="flex gap-2">
                           <button onClick={() => handleEdit(dim)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-100">
                             <Edit3 size={16} />
                           </button>
                           <button 
                            type="button"
                            onClick={() => handleDelete(dim.id)} 
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-100"
                           >
                             <Trash2 size={16} />
                           </button>
                         </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                          <Terminal size={12} /> System Prompt
                        </div>
                        <div className="bg-slate-900/5 p-4 rounded-xl border border-slate-100">
                          <p className="text-[11px] leading-relaxed text-slate-600 whitespace-pre-wrap font-mono line-clamp-3">
                            {dim.systemPrompt}
                          </p>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
          {/* Other tabs omitted for brevity */}
        </div>
      </div>
    </div>
  );
};
