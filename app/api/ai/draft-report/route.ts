import { spawn } from 'child_process';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { accident_type, location, occurred_at, victim_count, injury_severity, incident_note, immediate_action_note } = await request.json();

  const prompt = `당신은 산업안전 전문 문서 작성 전문가입니다. 현장 담당자가 짧게 메모한 내용을 정식 경위서 문체(문어체, 객관적 서술)로 변환해주세요.

사고 유형: ${accident_type}
발생 장소: ${location}
발생 일시: ${occurred_at}
피해 인원: ${victim_count}명 (부상 정도: ${injury_severity})

[사고 경위 메모]: ${incident_note}
[즉시 조치 메모]: ${immediate_action_note}

반드시 다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{"incident_description": "정식 문체로 작성된 사고 경위 (4~6문장, 시간·장소·상황·피해를 포함)", "immediate_action": "정식 문체로 작성된 즉시 조치 사항 (2~3문장)"}`;

  const result = await new Promise<string>((resolve) => {
    const proc = spawn('claude', ['-p', prompt], { stdio: ['pipe', 'pipe', 'pipe'] });
    proc.stdin?.end();
    let out = '';
    proc.stdout?.on('data', (chunk: Buffer) => { out += chunk.toString(); });
    proc.on('close', () => resolve(out));
    proc.on('error', () => resolve('{"incident_description": "", "immediate_action": ""}'));
  });

  try {
    const match = result.match(/\{[\s\S]*?\}/);
    if (match) return NextResponse.json(JSON.parse(match[0]));
  } catch {}

  return NextResponse.json({ incident_description: incident_note, immediate_action: immediate_action_note });
}
