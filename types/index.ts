export type AnalysisGuideline = {
  id: number;
  name: string;
  description: string;
  prompt_template: string;
  sort_order: number;
  updated_at: string;
};

export type AccidentAnalysis = {
  id: number;
  keyword: string;
  accident_type: string;
  submitted_content: string;
  risk_level: number | null;
  risk_summary: string | null;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
};

export type LegacyPerspectiveResult = {
  id: number;
  analysis_id: number;
  guideline_id: number;
  guideline_name?: string;
  content: string | null;
  status: 'pending' | 'analyzing' | 'completed';
};

export type CourtCase = {
  id: number;
  case_number: string;
  court_name: string;
  judgment_date: string;
  accident_type: string;
  incident_summary: string;
  judgment_result: string;
  penalty: string | null;
  compensation_amount: number | null;
  risk_level: number | null;
  keywords: string | null;
  created_at: string;
};

export type DashboardStats = {
  total_analyses: number;
  completed_analyses: number;
  avg_risk_level: number;
  high_risk_count: number;
  monthly_counts: { month: string; count: number }[];
  risk_distribution: { level: number; count: number; label: string }[];
  recent_analyses: AccidentAnalysis[];
};

export type Site = {
  id: number;
  name: string;
  address: string | null;
  approver_pin: string;
  created_at: string;
};

export type Report = {
  id: number;
  site_id: number;
  site_name?: string;
  reporter_name: string;
  reporter_department: string;
  accident_type: string;
  occurred_at: string;
  location: string;
  victim_count: number;
  injury_severity: string;
  incident_note: string;
  incident_description: string;
  immediate_action_note: string;
  immediate_action: string;
  witnesses: string | null;
  status: 'submitted' | 'approved';
  analysis_id: number | null;
  approver_name: string | null;
  approved_at: string | null;
  approver_comment: string | null;
  created_at: string;
};

export type ReportPhoto = {
  id: number;
  report_id: number;
  file_path: string;
  file_name: string;
  created_at: string;
};

export type UserSession = {
  name: string;
  department: string;
  site_id: number;
  site_name: string;
  role: 'writer' | 'approver';
};

export const INJURY_SEVERITIES = ['사망', '중상', '경상', '무상해'] as const;

export const ACCIDENT_TYPES = [
  '지게차 사고',
  '추락 사고',
  '협착 사고',
  '적재물 추락',
  '교통사고',
  '화재/폭발',
  '화학물질 누출',
  '전기 사고',
  '중량물 취급',
  '기타',
] as const;

export type AccidentType = (typeof ACCIDENT_TYPES)[number];

export const RISK_LEVEL_CONFIG: Record<number, { label: string; color: string; bg: string; border: string; text: string }> = {
  1: { label: '책임 최소', color: 'green', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  2: { label: '경미한 책임', color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  3: { label: '중간 책임', color: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
  4: { label: '높은 책임', color: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  5: { label: '중대재해 위험', color: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
};

// ─── data-foundation 스펙 타입 ───

export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';
export type RiskLevel = 'low' | 'medium' | 'high';
export type Recommendation = 'approved' | 'rejected' | 'need_info';
export type PerspectiveKey = 'identity' | 'industry' | 'reputation' | 'documents';
export type PerspectiveStatus = 'completed' | 'failed';

export type Merchant = {
  id: number; name: string; business_number: string;
  representative: string | null; category: string;
  address: string | null; submitted_docs: string | null; created_at: string;
};

export type PerspectiveResult = {
  key: PerspectiveKey; title: string;
  findings: string; risk_level: RiskLevel; status: PerspectiveStatus;
};

export type Analysis = {
  id: number; merchant_id: number; status: AnalysisStatus;
  risk_grade: RiskLevel | null; recommendation: Recommendation | null;
  perspectives: string | null; report: string | null;
  final_decision: Recommendation | null; decision_memo: string | null;
  decided_by: string | null; decided_at: string | null; created_at: string;
};

export type AnalysisWithMerchant = Analysis & {
  merchant_name: string; merchant_category: string; business_number: string;
  representative: string | null; address: string | null; submitted_docs: string | null;
};

export type Guideline = { id: number; key: string; title: string; content: string; updated_at: string };

// dashboard 스펙 타입
export type DashboardRecentItem = {
  id: number;
  merchant_name: string;
  merchant_category: string;
  status: string;
  risk_grade: string | null;
  recommendation: string | null;
  final_decision: string | null;
  created_at: string;
};

export type PendingQueueItem = {
  id: number;
  merchant_name: string;
  merchant_category: string;
  risk_grade: RiskLevel;
  recommendation: Recommendation;
  created_at: string;
};

export type MerchantDashboard = {
  pending_decision: number;
  high_risk: number;
  throughput: { today: number; this_week: number };
  recommendation_dist: { approved: number; rejected: number; need_info: number };
  recent: DashboardRecentItem[];
  pending_queue: PendingQueueItem[];
};
