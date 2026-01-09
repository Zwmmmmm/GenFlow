
import { CategoryType, EvalTask, TestCase, EvalDimension, Dataset, PromptVersion } from './types';

export const CATEGORY_COLORS: Record<CategoryType, string> = {
  '简单基础任务': 'bg-blue-500',
  '复杂推理任务': 'bg-purple-500',
  '多轮对话与澄清': 'bg-orange-500',
  '模糊与鲁棒性': 'bg-teal-500'
};

// --- REFACTORED: MetricConfig with System Prompt ---
export interface MetricConfig extends EvalDimension {
  targetStep: 'orchestration' | 'tool' | 'response';
  method: 'Rule-based' | 'LLM-Judge';
  systemPrompt: string; // Replaced specific criteria with a single flexible prompt
}

export const GLOBAL_METRIC_CONFIGS: MetricConfig[] = [
  {
    id: 'm-01',
    name: '意图识别准确率',
    targetStep: 'orchestration',
    method: 'LLM-Judge',
    description: '评估 Agent 是否能正确识别用户的核心诉求并分类到正确的意图。',
    promptTemplate: '',
    systemPrompt: `你是一个专业的业务意图审计专家。
请根据用户的原始 Query 和 Agent 输出的意图分类结果进行评分：
- 2分：意图识别完全准确，置信度高，符合业务预期。
- 1分：意图基本正确，但在细分分类上存在微小模糊或置信度偏低。
- 0分：意图识别完全错误，导致后续链路失效。`
  },
  {
    id: 'm-02',
    name: '思考链逻辑性',
    targetStep: 'orchestration',
    method: 'LLM-Judge',
    description: '评估 CoT (Chain of Thought) 的推理过程是否逻辑连贯、步步为营。',
    promptTemplate: '',
    systemPrompt: `你是一个逻辑学专家，专门审计 AI 的推理路径。
请评估 Agent 的 CoT (Chain of Thought) 过程：
- 2分：推理路径清晰，逻辑严密，考虑到了所有上下文约束。
- 1分：推理过程基本完整，但存在冗余步骤或轻微的逻辑跳跃。
- 0分：推理逻辑断裂、出现严重幻觉或完全忽略了用户的关键约束。`
  },
  {
    id: 'm-03',
    name: '参数提取精度',
    targetStep: 'tool',
    method: 'Rule-based',
    description: '校验工具调用时的参数（Args）是否与用户指令中的信息完全一致。',
    promptTemplate: '',
    systemPrompt: `执行确定性参数匹配校验。
评分标准：
- 2分：所有关键槽位（Slots）提取准确，数值和格式无误。
- 1分：核心参数正确，但部分可选参数提取缺失或格式不规范。
- 0分：核心参数错误或缺失，直接导致工具无法执行或执行异常。`
  },
  {
    id: 'm-04',
    name: '回复幻觉检测',
    targetStep: 'response',
    method: 'LLM-Judge',
    description: '检查最终回复是否忠于工具返回的事实，是否存在捏造事实的情况。',
    promptTemplate: '',
    systemPrompt: `你是一个事实核查员，负责检测 AI 的回复幻觉。
对比工具返回的原始数据和最终生成的回复：
- 2分：完全忠于事实，没有任何捏造或过度推测。
- 1分：内容基本属实，但表达略显绝对或包含极少量不确定的推测性描述。
- 0分：回复内容与事实相悖，或者编造了工具数据中完全不存在的信息。`
  }
];

export const INITIAL_DIMENSIONS: EvalDimension[] = GLOBAL_METRIC_CONFIGS;

export const MOCK_TASKS_DATA: EvalTask[] = [
  {
    id: "TASK-20251217-01",
    name: "Regression_Daily_1217",
    model: "GenFlow-Pro-v2.1",
    date: "2025-12-17 14:30",
    totalCases: 1000,
    passRate: 92,
    avgScore: "1.8",
    status: 'completed',
    categoryStats: {
      '简单基础任务': { excellent: 90, acceptable: 8, fail: 2, score: 1.95 },
      '复杂推理任务': { excellent: 60, acceptable: 25, fail: 15, score: 1.6 },
      '多轮对话与澄清': { excellent: 50, acceptable: 28, fail: 22, score: 1.4 },
      '模糊与鲁棒性': { excellent: 85, acceptable: 10, fail: 5, score: 1.9 }
    }
  }
];

export const MOCK_CASES_DATA: TestCase[] = [];
export const MOCK_DATASETS: Dataset[] = [
  { id: 'DS-001', name: 'v1.0_基础回归集', count: 600, updateTime: '2025-12-01', description: '包含高频核心功能测试（搜索、管理、VIP问答）。' },
];
export const MOCK_PROMPTS: PromptVersion[] = [
  { id: 'P-001', name: 'System Prompt v3.5 (Prod)', type: 'System', updateTime: '2025-12-15', desc: '线上当前版本，优化了文件移动的意图识别。' },
];
