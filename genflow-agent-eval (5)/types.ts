
export type ScoreLevel = 0 | 1 | 2;

export type ViewMode = 'taskList' | 'taskDashboard' | 'caseExplorer' | 'settings';

export type CategoryType = '简单基础任务' | '复杂推理任务' | '多轮对话与澄清' | '模糊与鲁棒性';

// --- New: Configurable Metrics ---
export interface EvalDimension {
  id: string;
  name: string;
  description: string;
  promptTemplate: string;
}

export interface DimensionScore {
  dimensionId: string;
  dimensionName: string;
  score: ScoreLevel;
  comment: string;
}

// --- Extended Data Structures ---
export interface EvalTask {
  id: string;
  name: string;
  model: string;
  date: string;
  totalCases: number;
  passRate: number;
  avgScore: string;
  status: 'completed' | 'running' | 'failed';
  categoryStats: Record<CategoryType, { excellent: number, acceptable: number, fail: number, score: number }>;
}

export interface TestCase {
  id: string;
  taskId: string; 
  query: string;      // Clean query for UI display
  rawLog: string;     // Technical raw log content
  category: CategoryType; 
  status: ScoreLevel;
  tags: string[];
  judgeComment: string; 
  
  dimensionScores: DimensionScore[];

  steps: {
    name: string;
    type: 'orchestration' | 'tool' | 'response';
    score: ScoreLevel;
    expected: any;
    actual: any;
    dimensions?: { name: string; score: ScoreLevel; comment?: string }[];
  }[];
}

export interface Dataset {
  id: string;
  name: string;
  count: number;
  updateTime: string;
  description: string;
}

export interface PromptVersion {
  id: string;
  name: string;
  type: 'System' | 'Evaluation';
  updateTime: string;
  desc: string;
}
