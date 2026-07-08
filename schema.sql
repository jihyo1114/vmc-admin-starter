CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  approver_pin TEXT NOT NULL DEFAULT '1234',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL REFERENCES sites(id),
  reporter_name TEXT NOT NULL,
  reporter_department TEXT NOT NULL,
  accident_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  location TEXT NOT NULL,
  victim_count INTEGER NOT NULL DEFAULT 0,
  injury_severity TEXT NOT NULL DEFAULT '경상',
  incident_note TEXT NOT NULL,
  incident_description TEXT NOT NULL,
  immediate_action_note TEXT NOT NULL,
  immediate_action TEXT NOT NULL,
  witnesses TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  analysis_id INTEGER REFERENCES accident_analyses(id),
  approver_name TEXT,
  approved_at TEXT,
  approver_comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS report_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES reports(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

INSERT OR IGNORE INTO sites (id, name, address, approver_pin) VALUES
(1, '인천 물류센터', '인천시 서구 원창동 123', '1234'),
(2, '김포 배송 센터', '경기 김포시 고촌읍 456', '1234'),
(3, '부산 물류허브', '부산시 강서구 미음동 789', '1234'),
(4, '대전 중부센터', '대전시 대덕구 신탄진로 321', '1234'),
(5, '광주 서남권센터', '광주시 광산구 어룡동 654', '1234');

CREATE TABLE IF NOT EXISTS analysis_guidelines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS accident_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  accident_type TEXT NOT NULL,
  submitted_content TEXT NOT NULL,
  risk_level INTEGER,
  risk_summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS perspective_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id INTEGER NOT NULL REFERENCES accident_analyses(id),
  guideline_id INTEGER NOT NULL REFERENCES analysis_guidelines(id),
  content TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS court_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_number TEXT NOT NULL UNIQUE,
  court_name TEXT NOT NULL,
  judgment_date TEXT NOT NULL,
  accident_type TEXT NOT NULL,
  incident_summary TEXT NOT NULL,
  judgment_result TEXT NOT NULL,
  penalty TEXT,
  compensation_amount INTEGER,
  risk_level INTEGER,
  keywords TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

INSERT OR IGNORE INTO analysis_guidelines (id, name, description, prompt_template, sort_order) VALUES
(1, '산업안전보건법 준수 분석', '산업안전보건법 및 관련 법령 준수 여부를 분석합니다.',
'당신은 대한민국 산업안전보건법 전문가입니다. 다음 물류회사 안전사고에 대해 산업안전보건법 준수 관점에서 분석하세요. 위반된 조항, 준수된 조항, 개선 필요 사항을 구체적으로 명시하세요. 마크다운 없이 평문으로 작성하세요.

사고 키워드: {keyword}
사고 유형: {accident_type}
제출 내용: {content}', 1),

(2, '근로자 과실 판단', '근로자의 과실 여부 및 과실 수준을 분석합니다.',
'당신은 노동법 전문 변호사입니다. 다음 물류회사 안전사고에서 근로자의 과실 여부를 분석하세요. 과실 유형, 과실 비율, 관련 판례 기준을 근거로 분석하세요. 마크다운 없이 평문으로 작성하세요.

사고 키워드: {keyword}
사고 유형: {accident_type}
제출 내용: {content}', 2),

(3, '회사 안전관리 의무', '회사의 안전관리 의무 이행 여부를 분석합니다.',
'당신은 산업안전 컨설턴트입니다. 다음 물류회사 안전사고에서 회사의 안전관리 의무 이행 여부를 분석하세요. 안전교육, 보호구 지급, 작업환경 관리, 위험성 평가 이행 여부를 검토하세요. 마크다운 없이 평문으로 작성하세요.

사고 키워드: {keyword}
사고 유형: {accident_type}
제출 내용: {content}', 3),

(4, '법적 선례 및 판례 분석', '유사 법원 판례 및 법적 선례를 분석합니다.',
'당신은 산업재해 전문 법무사입니다. 다음 물류회사 안전사고와 유사한 대한민국 법원 판례를 분석하세요. 유사 사례의 판결 결과, 법적 근거, 손해배상 수준을 구체적으로 분석하세요. 마크다운 없이 평문으로 작성하세요.

사고 키워드: {keyword}
사고 유형: {accident_type}
제출 내용: {content}', 4),

(5, '재발 방지 및 리스크 평가', '재발 방지 조치 및 전반적 리스크를 평가합니다.',
'당신은 EHS(환경·보건·안전) 전문가입니다. 다음 물류회사 안전사고의 재발 방지 조치 적절성을 평가하고, 유사 사고 발생 시 예상되는 법적·재무적 리스크를 분석하세요. 마크다운 없이 평문으로 작성하세요.

사고 키워드: {keyword}
사고 유형: {accident_type}
제출 내용: {content}', 5);

INSERT OR IGNORE INTO court_cases (id, case_number, court_name, judgment_date, accident_type, incident_summary, judgment_result, penalty, compensation_amount, risk_level, keywords) VALUES
(1, '2023고단1842', '창원지방법원', '2023-08-15', '지게차 사고', '물류창고 내 지게차 운행 중 통행 근로자와 충돌하여 1명 사망. 운행 경로 미표시, 작업 전 안전점검 미실시 확인됨.', '유죄', '금고 2년 집행유예 3년', 15000, 4, '지게차,충돌,사망,창고'),
(2, '2023고단0431', '서울동부지방법원', '2023-03-22', '적재물 추락', '컨테이너 적재 작업 중 고정 불량으로 화물이 낙하, 근로자 2명 부상. 안전작업 절차서 미비, 안전모 미착용 확인.', '유죄', '벌금 1,000만원', 5000, 3, '적재,추락,부상,컨테이너'),
(3, '2022고합0298', '부산지방법원', '2022-11-08', '협착 사고', '컨베이어 벨트 점검 중 비정지 상태에서 작업 진행하다 협착 사망. 잠금장치 미설치, LOTO 절차 미수행.', '유죄', '금고 1년 6개월', 20000, 5, '컨베이어,협착,사망,LOTO'),
(4, '2023고단2105', '인천지방법원', '2023-05-30', '추락 사고', '3m 높이 적재대에서 하차 작업 중 추락하여 골절상. 안전난간 미설치, 안전대 미지급 확인.', '유죄', '과태료 500만원', 3000, 3, '추락,적재대,안전난간,골절'),
(5, '2022고합0512', '대구지방법원', '2022-09-14', '화재/폭발', '물류창고 내 리튬배터리 충전 중 화재 발생, 근로자 3명 화상. 화재감지기 고장 방치, 소화설비 점검 미실시.', '유죄', '금고 3년', 50000, 5, '화재,배터리,화상,창고'),
(6, '2023고단3317', '수원지방법원', '2023-12-01', '지게차 사고', '전동지게차 급선회 중 전도, 운전자 경상. 지게차 점검 일지 부재, 운전 자격증 미소지 확인.', '유죄', '벌금 800만원', 2500, 3, '지게차,전도,경상,전동'),
(7, '2023고합0178', '대전지방법원', '2023-07-19', '추락 사고', '물류센터 지붕 보수 작업 중 채광창 파손으로 추락 사망. 작업 계획서 미수립, 안전대 부착설비 미설치.', '유죄', '금고 2년 6개월', 30000, 5, '추락,지붕,사망,안전대'),
(8, '2022고단0987', '울산지방법원', '2022-04-28', '화학물질 누출', '위험물 보관 창고 밸브 파손으로 화학물질 누출, 근로자 1명 화학화상. 위험물 취급 절차 미이행.', '유죄', '과태료 1,000만원', 10000, 4, '화학물질,누출,화상,위험물'),
(9, '2023고단2890', '광주지방법원', '2023-10-15', '협착 사고', '팔레트 랩핑 기계 청소 중 가동 상태에서 손가락 협착, 절단 부상. 안전 커버 제거 후 방치 확인.', '유죄', '벌금 1,500만원', 4000, 4, '협착,랩핑,절단,안전커버'),
(10, '2023고단0654', '의정부지방법원', '2023-01-25', '교통사고', '야간 배송 운전 중 졸음운전으로 중앙선 침범 사고, 1명 중상. 운전 시간 기록 부재, 휴게시간 미부여.', '유죄', '벌금 700만원', 1500, 3, '교통,야간,졸음운전,배송');

INSERT OR IGNORE INTO accident_analyses (id, keyword, accident_type, submitted_content, risk_level, risk_summary, status, created_at, completed_at) VALUES
(1, '지게차 충돌', '지게차 사고', '창고 내 지게차 운행 중 보행 직원과 충돌 발생. 안전 통로 표시 있었으나 시야 확보 불량 구역.', 4, '안전관리 의무 일부 미이행으로 높은 법적 책임 예상', 'completed', '2026-01-08 09:23:00', '2026-01-08 09:35:00'),
(2, '화물 추락', '적재물 추락', '2층 적재대에서 화물 낙하. 근로자 안전모 미착용 상태였으며 안전망 미설치.', 5, '중대재해처벌법 적용 가능한 심각한 안전 위반', 'completed', '2026-01-15 14:10:00', '2026-01-15 14:22:00'),
(3, '컨베이어 끼임', '협착 사고', '컨베이어 청소 중 가동 상태에서 작업 진행. LOTO 절차 미수행. 경상 처리됨.', 3, '안전 절차 미수행으로 중간 수준의 법적 책임', 'completed', '2026-01-24 11:05:00', '2026-01-24 11:17:00'),
(4, '야간 배송 사고', '교통사고', '심야 배송 차량 추돌 사고. 운전자 12시간 연속 운전 기록 존재.', 4, '근로시간 위반 및 안전관리 의무 위반으로 높은 책임', 'completed', '2026-02-03 08:45:00', '2026-02-03 08:57:00'),
(5, '화재 발생', '화재/폭발', '배터리 충전실 화재. 소화기 점검 일지 3개월 공백. 근로자 대피 완료.', 3, '소화설비 관리 소홀이 인정되나 인명피해 없음', 'completed', '2026-02-11 16:20:00', '2026-02-11 16:32:00'),
(6, '낙상 부상', '추락 사고', '사다리 작업 중 미끄러짐. 안전화 착용 여부 불명확. 2주 진단.', 2, '경미한 안전 절차 미흡, 낮은 수준의 법적 책임', 'completed', '2026-02-19 10:30:00', '2026-02-19 10:42:00'),
(7, '지게차 전도', '지게차 사고', '경사로에서 지게차 전도. 과적 상태 운행 확인됨. 운전자 경상.', 4, '과적 운행 허가 및 안전관리 위반으로 높은 책임', 'completed', '2026-02-28 13:15:00', '2026-02-28 13:27:00'),
(8, '화학물질 노출', '화학물질 누출', '위험물 취급 중 보호구 미착용 피부 접촉. 해당 물질 MSDS 비치 여부 불명.', 3, '위험물 관리 절차 일부 미흡, 중간 수준 책임', 'completed', '2026-03-05 09:00:00', '2026-03-05 09:12:00'),
(9, '고소 작업 추락', '추락 사고', '높이 4m 선반 정리 작업 중 추락. 안전발판 미사용, 안전대 미착용. 골절 부상.', 5, '다중 안전 의무 위반으로 중대재해 해당 가능성', 'completed', '2026-03-14 15:40:00', '2026-03-14 15:52:00'),
(10, '집게 협착', '협착 사고', '파렛트 분리 작업 중 장비에 손가락 협착. 방호장치 정상 작동 확인.', 2, '방호장치 정상이나 안전교육 강화 필요', 'completed', '2026-03-22 11:50:00', '2026-03-22 12:02:00'),
(11, '적재 불량 낙하', '적재물 추락', '선반 적재 불량으로 박스 낙하. 통행 구역 미설정이 원인으로 추정.', 3, '통행구역 관리 미흡으로 중간 수준 책임', 'completed', '2026-04-02 08:30:00', '2026-04-02 08:42:00'),
(12, '지게차 충돌 2', '지게차 사고', '야간 창고 지게차 운행 중 조명 불량 구역 사고. 조명 점검 일지 부재.', 4, '야간 작업 환경 관리 소홀로 높은 법적 책임', 'completed', '2026-04-10 22:15:00', '2026-04-10 22:27:00'),
(13, '전기 감전', '전기 사고', '분전반 점검 중 감전. 절연 장갑 착용 확인됨. 경상 처리.', 1, '회사 안전 조치 이행, 근로자 부주의가 주된 원인', 'completed', '2026-04-18 14:00:00', '2026-04-18 14:12:00'),
(14, '이동식 크레인', '중량물 취급', '이동식 크레인 작업 반경 내 근로자 진입으로 충돌 아차사고. 작업 구역 통제 미흡.', 3, '작업구역 통제 미흡으로 중간 수준 책임', 'completed', '2026-05-06 10:20:00', '2026-05-06 10:32:00'),
(15, '화물차 추돌', '교통사고', '배송 중 후방 추돌 피해. 블랙박스 영상 확보됨. 상대 차량 과실 명확.', 1, '명확한 상대방 과실, 회사 책임 최소', 'completed', '2026-05-14 16:45:00', '2026-05-14 16:57:00'),
(16, '낙하물 부상', '적재물 추락', '선반 상단 작업 후 공구 낙하. 하부 작업자 안전모 착용 중 경상.', 2, '공구 관리 미흡이나 보호구 착용으로 피해 경감', 'completed', '2026-05-23 09:10:00', '2026-05-23 09:22:00'),
(17, '지게차 사고 3', '지게차 사고', '좁은 통로 지게차 운행 중 벽면 충격. 차량 손상만 발생. 운전 자격증 정상 보유.', 2, '운행 관리 일부 미흡이나 인명 피해 없음', 'completed', '2026-06-04 13:30:00', '2026-06-04 13:42:00'),
(18, '추락 방지망 미설치', '추락 사고', '2층 작업대 추락 방지망 미설치 구간에서 작업. 시정 지시 이후에도 미설치 지속.', 5, '반복적 안전 의무 위반으로 최고 수준 법적 책임', 'completed', '2026-06-12 10:00:00', '2026-06-12 10:12:00'),
(19, '발목 골절', '추락 사고', '창고 계단 미끄럼 방지 테이프 탈락 구간에서 낙상. 시설 점검 미흡.', 3, '시설 유지보수 소홀로 중간 수준 책임', 'completed', '2026-06-20 15:25:00', '2026-06-20 15:37:00'),
(20, '화물 포장 불량', '적재물 추락', '포장 불량 화물 이동 중 낙하. 출하 전 검수 절차 있었으나 누락됨.', 3, '검수 절차 누락으로 중간 수준 법적 책임', 'completed', '2026-07-01 11:00:00', '2026-07-01 11:12:00');

INSERT OR IGNORE INTO perspective_results (analysis_id, guideline_id, content, status)
SELECT a.id, g.id, '샘플 분석 결과입니다.', 'completed'
FROM accident_analyses a, analysis_guidelines g
WHERE a.id <= 20 AND g.id <= 5;

-- data-foundation 스펙 테이블
CREATE TABLE IF NOT EXISTS merchants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  business_number TEXT NOT NULL,
  representative TEXT,
  category TEXT NOT NULL,
  address TEXT,
  submitted_docs TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL REFERENCES merchants(id),
  status TEXT NOT NULL DEFAULT 'pending',
  risk_grade TEXT,
  recommendation TEXT,
  perspectives TEXT,
  report TEXT,
  final_decision TEXT,
  decision_memo TEXT,
  decided_by TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS guidelines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
