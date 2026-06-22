/**
 * Verita backend API response contracts.
 *
 * The backend (FastAPI) is the source of truth — these mirror the dict shapes
 * returned by app/routers/*. Kept deliberately close to the wire format so the
 * frontend never hand-casts `any` off a fetch.
 */

/* ── Risk levels / tiers — canonical Title-case to match the backend ──────────
 * Backend stores Title-case ("Low" | "Medium" | "High" | "Critical").
 * `normalizeRiskLevel` is the single boundary normalizer so UI comparisons can
 * never drift from the stored casing (the bug that made FLAGGED unreachable). */
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export function normalizeRiskLevel(raw: string | null | undefined): RiskLevel | null {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    case "critical":
      return "Critical";
    default:
      return null;
  }
}

/** Severe tiers that warrant an alert/flag, regardless of source casing. */
export function isSevere(raw: string | null | undefined): boolean {
  const lvl = normalizeRiskLevel(raw);
  return lvl === "High" || lvl === "Critical";
}

/* ── History (audit trail) ───────────────────────────────────────────────── */
export interface HistorySummary {
  analyses: number;
  investigations: number;
  queries: number;
}

export interface AnalysisRun {
  id: number;
  dataset_id: string;
  filename: string;
  title: string;
  row_count: number;
  column_count: number;
  quality_score: number;
  quality_grade: string;
  insights_count: number;
  created_at: string | null;
}

export interface QueryLog {
  id: number;
  dataset_id: string;
  sql: string;
  row_count: number;
  elapsed_ms: number;
  mode: string;
  ok: boolean;
  created_at: string | null;
}

export interface InvestigationRecord {
  id: number;
  dataset_id: string;
  goal: string;
  risk_level: string;
  finding_count: number;
  chain_head: string;
  memo_mode: string;
  created_at: string | null;
}

export interface AnalysesResponse {
  analyses: AnalysisRun[];
}
export interface QueriesResponse {
  queries: QueryLog[];
}
export interface InvestigationsResponse {
  investigations: InvestigationRecord[];
}

/* ── Risk engine ─────────────────────────────────────────────────────────── */
export interface CurvePoint {
  x: number;
  y: number;
}
export interface FeatureImportance {
  feature: string;
  importance: number;
}
export interface ShapImportance {
  feature: string;
  mean_abs_shap: number;
}
export interface ConfusionMatrix {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface RiskMetrics {
  data_source: string;
  data_description: string;
  test_size: number;
  fraud_in_test: number;
  threshold: number;
  roc_auc: number;
  pr_auc: number;
  precision: number;
  recall: number;
  f1: number;
  confusion_matrix: ConfusionMatrix;
  roc_curve: CurvePoint[];
  pr_curve: CurvePoint[];
  feature_importance: FeatureImportance[];
  shap_importances: ShapImportance[];
  shap_available: boolean;
}

export interface RiskAlert {
  rank: number;
  risk_score: number;
  risk_tier: RiskLevel;
  anomaly_score: number;
  is_fraud_actual: number;
  flagged: boolean;
  transaction_id: string;
  amount: number;
  channel: string;
  country: string;
}

export interface RiskAlertsResponse {
  data_source: string;
  threshold: number;
  alerts: RiskAlert[];
}

export interface CrossValidationResult {
  method: string;
  metric: string;
  n_folds: number;
  scores: number[];
  mean: number;
  std: number;
  held_out_score: number | null;
  consistent_with_held_out: boolean;
  interpretation: string;
}

/* ── Cost-optimal decision threshold (GET /api/risk/optimal-threshold) ──────── */
export interface ThresholdCostPoint {
  threshold: number;
  expected_cost: number;
}
export interface ThresholdConfusion {
  threshold: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  expected_cost: number;
  precision: number;
  recall: number;
}
export interface OptimalThresholdResult {
  cost_fn: number;
  cost_fp: number;
  currency: string;
  optimal_threshold: number;
  optimal: ThresholdConfusion;
  baseline_0_5: ThresholdConfusion;
  savings_vs_0_5: number;
  savings_pct: number;
  cost_curve: ThresholdCostPoint[];
  interpretation: string;
  data_source: string;
  test_size: number;
}

/* ── Per-case SHAP reason codes (GET /api/risk/explain/{idx}) ───────────────── */
export interface ReasonCode {
  feature: string;
  label: string;
  shap: number;
  direction: "raises_risk" | "lowers_risk";
  weight_pct: number;
  value: number | null;
  reason: string;
}
export interface ReasonCodeExplanation {
  predicted_probability: number;
  model_logit: number;
  output_space: string;
  base_value: number;
  decision: string;
  headline: string;
  reason_codes: ReasonCode[];
  method: string;
}
export interface RiskExplanation {
  transaction_idx: number;
  feature_names: string[];
  shap_values: number[];
  base_value: number;
  feature_data: number[];
  output_space: string;
  interpretation: string;
  plain_english?: ReasonCodeExplanation;
}

/* ── SQL playground ──────────────────────────────────────────────────────── */
export type SqlValue = string | number | boolean | null;

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, SqlValue>[];
  row_count: number;
  truncated: boolean;
  elapsed_ms: number;
}

export interface SqlTranslateResult {
  sql: string;
  mode: string;
  interpretation: {
    aggregate: string | null;
    measure: string | null;
    dimension: string | null;
    limit: number;
  };
  note: string;
}

/* ── Dashboard / profiling ───────────────────────────────────────────────── */
export interface DataProfile {
  row_count: number;
  column_count: number;
  measures: string[];
  dimensions: string[];
  temporals: string[];
  geos?: string[];
  columns?: ColumnProfile[];
  [key: string]: unknown;
}

export interface ColumnProfile {
  name: string;
  dtype: string;
  role?: string;
  missing_pct?: number;
  unique?: number;
  [key: string]: unknown;
}

export interface QualityDeduction {
  reason: string;
  points: number;
}
export interface QualityReport {
  score: number;
  grade: string;
  duplicate_rows: number;
  deductions: QualityDeduction[];
  [key: string]: unknown;
}

export interface ChartDatum {
  label: string;
  value: number;
}

export interface ChartSpec {
  id: string;
  chart_type: string;
  title: string;
  priority?: number;
  value?: string | number;
  accent?: string;
  dimension?: string;
  measure?: string;
  sql?: string;
  data?: ChartDatum[] | Record<string, unknown>[];
  [key: string]: unknown;
}

export interface GraphNode {
  id: string;
  type: string;
  label?: string;
  group?: string;
  [key: string]: unknown;
}
export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  sign: string;
  kind: string;
  label: string;
  [key: string]: unknown;
}
export interface RelationshipGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface DashboardResponse {
  dataset_id: string;
  filename: string;
  title: string;
  sampled: boolean;
  profile: DataProfile;
  dashboard: ChartSpec[];
  insights: Insight[];
  quality: QualityReport;
  executive_summary: string;
  genai_mode: string;
  relationships: RelationshipGraph;
}

export interface Insight {
  text: string;
  evidence: string;
  severity?: string;
  [key: string]: unknown;
}

/* ── Forecast / compare / frames ─────────────────────────────────────────── */
export interface ForecastModelScore {
  model: string;
  mape: number | null;
}
export interface ForecastResult {
  method: string;
  backtest_mape: number | null;
  tournament?: ForecastModelScore[];
  history?: { x: string; y: number }[];
  forecast?: { x: string; y: number; lo?: number; hi?: number }[];
  [key: string]: unknown;
}

export interface CompareResult {
  headline: {
    period_a: { from: string; to: string; rows: number };
    period_b: { from: string; to: string; rows: number };
    volume_change_pct: number | null;
    total_change_pct: number | null;
    mean_change_pct: number | null;
    measure: string;
  };
  movers: {
    dimension: string;
    category: string;
    before: number;
    after: number;
    change_pct: number;
  }[];
}

export interface TimeFrame {
  period: string;
  rows: number;
  total: number;
  mean: number;
  by_dimension?: { dimension: string; data: ChartDatum[] };
}
export interface FramesResult {
  measure: string;
  time_col: string;
  frames: TimeFrame[];
}

/* ── NLP ─────────────────────────────────────────────────────────────────── */
export interface NlpEntity {
  text: string;
  label: string;
  start: number;
  end: number;
}
export interface RegulatoryMatch {
  framework: string;
  keyword: string;
  context: string;
}
export interface NlpResult {
  risk_score: number;
  risk_level: string;
  recommended_action: string;
  signals: string[];
  entities: NlpEntity[];
  regulatory_matches: RegulatoryMatch[];
  framework_hits: Record<string, number>;
  summary: Record<string, number>;
}

/* ── Investigator (agent) ────────────────────────────────────────────────── */
export interface InvestigationStep {
  step: number;
  title: string;
  thought?: string;
  action?: string;
  result?: unknown;
  hash?: string;
  [key: string]: unknown;
}
export interface HashChain {
  head: string;
  links?: { index: number; hash: string; prev: string }[];
  [key: string]: unknown;
}
export interface InvestigateResult {
  title: string;
  risk_level: string;
  confirmed_count: number;
  memo: string;
  memo_mode: string;
  steps: InvestigationStep[];
  chain: HashChain;
  [key: string]: unknown;
}

/* ── Settings / health ───────────────────────────────────────────────────── */
export interface RiskModelInfo {
  status: string;
  data_source?: string;
  shap_available?: boolean;
  features?: number;
  roc_auc?: number;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  auth: string;
  risk_model: RiskModelInfo;
  genai: string;
  database?: { dialect: string; ready: boolean };
  capabilities?: string[];
}
