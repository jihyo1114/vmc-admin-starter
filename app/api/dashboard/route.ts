import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import type { MerchantDashboard, DashboardRecentItem } from '@/types/index';

export async function GET() {
  const db = getDB();

  const pendingDecision = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM analyses WHERE status = 'completed' AND final_decision IS NULL",
      )
      .get() as { count: number }
  ).count;

  const highRisk = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM analyses WHERE risk_grade = 'high' OR recommendation = 'rejected'",
      )
      .get() as { count: number }
  ).count;

  const throughputToday = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM analyses WHERE status = 'completed' AND date(created_at) = date('now', 'localtime')",
      )
      .get() as { count: number }
  ).count;

  // 이번주: 일요일 기준 7일 범위
  const throughputWeek = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM analyses WHERE status = 'completed' AND created_at >= date('now', 'weekday 0', '-7 days', 'localtime')",
      )
      .get() as { count: number }
  ).count;

  const distRow = db
    .prepare(
      `SELECT
        SUM(CASE WHEN recommendation = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN recommendation = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN recommendation = 'need_info' THEN 1 ELSE 0 END) as need_info
      FROM analyses`,
    )
    .get() as { approved: number | null; rejected: number | null; need_info: number | null };

  const recent = db
    .prepare(
      `SELECT a.id, m.name as merchant_name, m.category as merchant_category,
        a.status, a.risk_grade, a.recommendation, a.final_decision, a.created_at
      FROM analyses a
      JOIN merchants m ON m.id = a.merchant_id
      ORDER BY a.created_at DESC
      LIMIT 10`,
    )
    .all() as DashboardRecentItem[];

  const body: MerchantDashboard = {
    pending_decision: pendingDecision,
    high_risk: highRisk,
    throughput: { today: throughputToday, this_week: throughputWeek },
    recommendation_dist: {
      approved: distRow.approved ?? 0,
      rejected: distRow.rejected ?? 0,
      need_info: distRow.need_info ?? 0,
    },
    recent,
  };

  return NextResponse.json(body);
}
