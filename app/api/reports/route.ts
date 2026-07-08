import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const db = getDB();
  const reports = db.prepare(`
    SELECT r.*, s.name as site_name
    FROM reports r
    JOIN sites s ON s.id = r.site_id
    ORDER BY r.created_at DESC
  `).all();
  return NextResponse.json(reports);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    site_id, reporter_name, reporter_department,
    accident_type, occurred_at, location,
    victim_count, injury_severity,
    incident_note, incident_description,
    immediate_action_note, immediate_action,
    witnesses,
  } = body;

  const db = getDB();

  const result = db.prepare(`
    INSERT INTO reports (
      site_id, reporter_name, reporter_department,
      accident_type, occurred_at, location,
      victim_count, injury_severity,
      incident_note, incident_description,
      immediate_action_note, immediate_action,
      witnesses, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')
  `).run(
    site_id, reporter_name, reporter_department,
    accident_type, occurred_at, location,
    victim_count, injury_severity,
    incident_note, incident_description,
    immediate_action_note, immediate_action,
    witnesses ?? null,
  );

  return NextResponse.json({ id: result.lastInsertRowid });
}
