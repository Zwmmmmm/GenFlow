
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
  systemPrompt: string; 
}

export const GLOBAL_METRIC_CONFIGS: MetricConfig[] = [
  {
    id: 'm-01',
    name: '编排准确率',
    targetStep: 'orchestration',
    method: 'Rule-based',
    description: '评估 Agent 是否能正确识别用户的核心诉求并提取准确的参数。',
    promptTemplate: '',
    systemPrompt: `# Role
你是一个严格的 AI 评测专家，专门评估 Agent 的“意图识别”和“参数提取”准确率。

# Task
请对比 Agent 的实际编排结果 (Agent Output) 与标准答案 (Ground Truth)，并根据评分标准进行 0-1-2 打分。

# Input Data
- 用户指令 (User Query): """{{user_query}}"""
- 标准答案 (Ground Truth): 
{{ground_truth}}
- Agent 实际输出 (Agent Output): 
{{agent_output}}

# Evaluation Criteria (0-1-2 Scoring)

## 2分 (优质 - Perfect Match)
- **定义**：Agent 的输出与人工标注的标准答案完全一致，或仅在非核心字段上做了正确的格式归一化。
- **标准**：
    1. 意图 (Intent/API) 完全一致。
    2. 核心参数 (Core Slots) 完全一致。
    3. 非核心参数一致，或逻辑等效（例如将“上周”转为具体日期）。
    4. 没有多余的错误参数。

## 1分 (可用 - Acceptable)
- **定义**：核心意图正确，但存在细微瑕疵，不影响任务主体执行。
- **标准**：
    1. 意图 (Intent/API) 正确。
    2. 核心参数正确。
    3. **缺陷**：遗漏了非核心参数（如漏了排序方式、数量限制），或者参数格式不标准但后端可兼容。

## 0分 (不可用 - Fail)
- **定义**：意图错误或关键参数缺失，导致任务无法执行或执行错误。
- **标准**：
    1. 意图错误（如“搜索”变“删除”）。
    2. 核心参数缺失或错误（如搜索文件时未提取关键词）。
    3. 提取了导致执行报错的幻觉参数。

# Output Format
请仅输出以下 JSON 格式，不要包含Markdown标记：
{
    "score": <int, 0/1/2>,
    "reason": "<string, 简短的评分理由，指出具体哪个参数错或漏了>"
}`
  },
  {
    id: 'm-02',
    name: '工具输出效果',
    targetStep: 'tool',
    method: 'LLM-Judge',
    description: '评估工具 API 返回的数据是否满足了用户的查询需求。',
    promptTemplate: '',
    systemPrompt: `# Role
你是一个数据质量评估专家。你的任务是判断工具API返回的数据是否满足了用户的查询需求。

# Task
分析用户指令和工具返回的原始数据，判断工具执行的有效性和精准度。

# Input Data
- 用户指令 (User Query): """{{user_query}}"""
- 调用工具 (Tool Name): {{tool_name}}
- 工具返回数据 (Tool Output): 
{{tool_response}}

# Evaluation Criteria (0-1-2 Scoring)

## 2分 (优质 - High Precision & Beyond)
- **定义**：工具返回的数据精准命中用户需求，信噪比极高，甚至超出预期。
- **标准**：
    1. **精准命中**：返回的数据完全符合用户的所有显性和隐性条件（如时间、类型、关键词）。
    2. **无噪声**：列表页未包含明显不相关的数据。
    3. **信息丰富**：包含了有助于决策的关键元数据（如摘要、预览图信息）。

## 1分 (可用 - Recall Oriented)
- **定义**：工具返回了用户需要的数据，但不够精准，包含干扰项。
- **标准**：
    1. **包含目标**：用户需要的文件/信息确实在返回结果列表中。
    2. **存在噪声**：返回结果过多或不够精准（Top N 中混杂了无关数据），需要用户进一步筛选。
    3. **未报错**：API调用成功。

## 0分 (不可用 - Fail)
- **定义**：工具调用失败，或返回结果与需求无关。
- **标准**：
    1. **无结果**：在数据库理应有数据的情况下返回了空列表（Hits=0）。
    2. **结果错误**：返回的数据与用户指令完全不相关（如搜“照片”返回“文档”）。
    3. **API报错**：返回了 HTTP 4xx/5xx 或内部错误码。

# Output Format
请仅输出以下 JSON 格式，不要包含Markdown标记：
{
    "score": <int, 0/1/2>,
    "reason": "<string, 评价返回数据的质量，指出是否有噪声或结果为空>"
}`
  },
  {
    id: 'm-03',
    name: '总结输出效果',
    targetStep: 'response',
    method: 'LLM-Judge',
    description: '评估 Agent 基于工具结果生成的最终回复是否准确、清晰。',
    promptTemplate: '',
    systemPrompt: `# Role
你是一个 AI 对话体验专家。请评估 Agent 基于工具结果生成给用户的最终回复质量。

# Task
基于工具返回的客观事实，检查 Agent 的回复是否准确、清晰、有结构感。

# Input Data
- 用户指令 (User Query): """{{user_query}}"""
- 工具客观事实 (Tool Output Context): 
{{tool_response}}
- Agent 最终回复 (Final Response): """{{final_response}}"""

# Evaluation Criteria (0-1-2 Scoring)

## 2分 (优质 - Structured & Insightful)
- **定义**：回复结构清晰，信息完整，并提供了增量价值。
- **标准**：
    1. **结构清晰**：使用了分点、表格、Markdown 等格式，易于快速阅读。
    2. **信息增益**：不仅复述工具结果，还提供了总结、关键信息提取或下一步建议（Next Step）。
    3. **完全准确**：严格基于工具事实，无任何幻觉。

## 1分 (可用 - Accurate but Flat)
- **定义**：回复准确但平淡，仅完成了信息的搬运。
- **标准**：
    1. **准确复述**：内容真实，没有幻觉。
    2. **平铺直叙**：缺乏结构化整理，或者语气较为生硬。
    3. **解决问题**：回答了用户的核心疑问。

## 0分 (不可用 - Hallucination or Broken)
- **定义**：回复存在事实性错误、不可读或未解决问题。
- **标准**：
    1. **幻觉**：编造了工具结果中不存在的文件或信息。
    2. **拒答/未答**：工具明明返回了结果，Agent 却说“没找到”或“无法处理”。
    3. **格式错误**：直接输出了 JSON 代码、调试信息，或未转化为自然语言。
    4. **安全性**：回复包含敏感或违规内容。

# Output Format
请仅输出以下 JSON 格式，不要包含Markdown标记：
{
    "score": <int, 0/1/2>,
    "reason": "<string, 重点指出是否有幻觉，格式是否清晰>"
}`
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
