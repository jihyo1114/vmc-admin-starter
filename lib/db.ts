import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (db) return db;
  const dataDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'admin.db');
  db = new Database(dbPath);
  const schema = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf-8');
  db.exec(schema);

  const merchantCount = (db.prepare('SELECT COUNT(*) as cnt FROM merchants').get() as { cnt: number }).cnt;
  if (merchantCount === 0) {
    seedData(db);
  }

  return db;
}

function seedData(db: Database.Database): void {
  // 가맹점 6건 삽입
  const insertMerchant = db.prepare(`
    INSERT INTO merchants (id, name, business_number, representative, category, address, submitted_docs, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMerchant.run(1, '행복편의점 강남점', '123-45-67890', '김편의', '일반 소매 (편의점)', '서울시 강남구 테헤란로 123', '사업자등록증, 통장사본, 임대차계약서', '2026-01-05 10:00:00');
  insertMerchant.run(2, '스마트키즈 교육', '234-56-78901', '이교육', '온라인 교육 플랫폼', '서울시 마포구 월드컵북로 45', '사업자등록증, 통장사본, 서비스 이용약관', '2026-01-10 11:30:00');
  insertMerchant.run(3, '중고나라 마켓', '345-67-89012', '박중고', '중고거래 중개 플랫폼', '경기도 성남시 분당구 판교로 678', '사업자등록증, 통장사본, 에스크로 계약서', '2026-01-15 14:00:00');
  insertMerchant.run(4, '빠른대출 서비스', '456-78-90123', '최대부', '단기 소액 대출 중개', '서울시 중구 을지로 99', '사업자등록증만 제출', '2026-01-20 09:00:00');
  insertMerchant.run(5, '어덜트샵 직구', '567-89-01234', '정성인', '성인용품 온라인 판매', '부산시 해운대구 센텀중앙로 55', '사업자등록증, 통장사본', '2026-01-25 15:30:00');
  insertMerchant.run(6, '럭키경품 게임', '678-90-12345', '한경품', '경품 게임 서비스 (도박성 의심)', '인천시 남동구 논현로 200', '사업자등록증 (유효기간 만료 임박)', '2026-02-01 16:00:00');

  // completed 분석 perspectives JSON (worst-wins 규칙 적용)

  // 가맹점 1 - 편의점: 전부 low → approved
  const perspectives1 = JSON.stringify([
    { key: 'identity', title: '신원 확인', findings: '대표자 실명 확인 완료. 사업자등록증 유효. 금융거래 이력 정상.', risk_level: 'low', status: 'completed' },
    { key: 'industry', title: '업종 위험도', findings: '편의점 업종은 표준 소매업으로 분류. 결제 분쟁 이력 없음.', risk_level: 'low', status: 'completed' },
    { key: 'reputation', title: '평판 조회', findings: '온라인 리뷰 평균 4.3점. 소비자 민원 신고 이력 없음.', risk_level: 'low', status: 'completed' },
    { key: 'documents', title: '서류 검토', findings: '사업자등록증, 통장사본, 임대차계약서 모두 정상 확인.', risk_level: 'low', status: 'completed' },
  ]);

  // 가맹점 2 - 온라인 교육: 전부 low → approved
  const perspectives2 = JSON.stringify([
    { key: 'identity', title: '신원 확인', findings: '대표자 신원 정상. 교육부 등록 교육업체 확인.', risk_level: 'low', status: 'completed' },
    { key: 'industry', title: '업종 위험도', findings: '어린이 교육 서비스는 저위험 업종. 콘텐츠 심의 통과 확인.', risk_level: 'low', status: 'completed' },
    { key: 'reputation', title: '평판 조회', findings: '학부모 커뮤니티 긍정 평가 다수. 언론 부정 이슈 없음.', risk_level: 'low', status: 'completed' },
    { key: 'documents', title: '서류 검토', findings: '모든 서류 적법하게 제출. 서비스 이용약관 소비자 보호 조항 포함.', risk_level: 'low', status: 'completed' },
  ]);

  // 가맹점 3 - 중고거래: reputation medium → worst=medium → need_info
  const perspectives3 = JSON.stringify([
    { key: 'identity', title: '신원 확인', findings: '대표자 신원 확인 완료. 법인 등록 정상.', risk_level: 'low', status: 'completed' },
    { key: 'industry', title: '업종 위험도', findings: 'C2C 중개 플랫폼은 사기 거래 연루 가능성 존재. 에스크로 운영으로 일부 완화.', risk_level: 'medium', status: 'completed' },
    { key: 'reputation', title: '평판 조회', findings: '사기 피해 신고 건수 월평균 12건 확인. 플랫폼 자체 해결률 85%. 소비자원 민원 3건.', risk_level: 'medium', status: 'completed' },
    { key: 'documents', title: '서류 검토', findings: '에스크로 계약서 정상. 에스크로 운영 방식 추가 소명 필요.', risk_level: 'low', status: 'completed' },
  ]);

  // 가맹점 4 - 대부업: industry high → worst=high → rejected
  const perspectives4 = JSON.stringify([
    { key: 'identity', title: '신원 확인', findings: '대표자 신용정보 조회 결과 과거 대부업 불법영업 행정처분 이력 확인.', risk_level: 'high', status: 'completed' },
    { key: 'industry', title: '업종 위험도', findings: '대부업은 금융위원회 등록 필수 고위험 업종. 등록 여부 확인 불가. 법정 이자율 초과 가능성 있음.', risk_level: 'high', status: 'completed' },
    { key: 'reputation', title: '평판 조회', findings: '불법 대출 광고 신고 이력 다수. 소비자 피해 신고 월평균 30건 이상.', risk_level: 'high', status: 'completed' },
    { key: 'documents', title: '서류 검토', findings: '사업자등록증 외 서류 미제출. 금융업 허가증 부재. 서류 불충분으로 심사 불가.', risk_level: 'medium', status: 'completed' },
  ]);

  // 가맹점 5 (pending - 분석 미완료)
  // 가맹점 6 (pending - 분석 미완료)

  // 분석 레코드 삽입
  const insertAnalysis = db.prepare(`
    INSERT INTO analyses (id, merchant_id, status, risk_grade, recommendation, perspectives, report, final_decision, decision_memo, decided_by, decided_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 가맹점 1 - completed, approved, 최종결정 완료
  insertAnalysis.run(
    1, 1, 'completed', 'low', 'approved',
    perspectives1,
    '행복편의점 강남점은 신원, 업종, 평판, 서류 모든 항목에서 저위험으로 확인됨. 정상 가맹점으로 승인을 권고합니다.',
    'approved',
    '전 항목 이상 없음. 즉시 가맹 승인.',
    '홍길동',
    '2026-01-06 15:00:00',
    '2026-01-05 14:00:00'
  );

  // 가맹점 2 - completed, approved, 최종결정 완료
  insertAnalysis.run(
    2, 2, 'completed', 'low', 'approved',
    perspectives2,
    '스마트키즈 교육은 정식 등록 교육업체로 리스크 요인 없음. 가맹 승인을 권고합니다.',
    'approved',
    '교육부 등록 정상, 서류 완비. 승인 처리.',
    '홍길동',
    '2026-01-11 10:00:00',
    '2026-01-10 15:00:00'
  );

  // 가맹점 3 - completed, need_info, 최종결정 완료
  insertAnalysis.run(
    3, 3, 'completed', 'medium', 'need_info',
    perspectives3,
    '중고나라 마켓은 사기 거래 신고 이력으로 추가 소명이 필요합니다. 에스크로 정책 및 사기 피해 처리 절차 문서 제출을 요청합니다.',
    'need_info',
    '사기 피해 건수 추이 및 처리 현황 자료 추가 요청 후 재심사 필요.',
    '홍길동',
    '2026-01-16 11:00:00',
    '2026-01-15 17:00:00'
  );

  // 가맹점 4 - completed, rejected, 최종결정 완료
  insertAnalysis.run(
    4, 4, 'completed', 'high', 'rejected',
    perspectives4,
    '빠른대출 서비스는 대부업 미등록 의심, 불법 대출 광고 이력, 대표자 행정처분 이력 등 복합 고위험 요인이 확인됨. 가맹 거절을 권고합니다.',
    'rejected',
    '대부업 미등록 및 불법영업 이력 확인. 가맹 불가.',
    '홍길동',
    '2026-01-21 09:30:00',
    '2026-01-20 12:00:00'
  );

  // 가맹점 5 - pending
  insertAnalysis.run(5, 5, 'pending', null, null, null, null, null, null, null, null, '2026-01-26 10:00:00');

  // 가맹점 6 - pending
  insertAnalysis.run(6, 6, 'pending', null, null, null, null, null, null, null, null, '2026-02-02 09:00:00');

  // 가이드라인 5건 삽입
  const insertGuideline = db.prepare(`
    INSERT INTO guidelines (key, title, content, updated_at) VALUES (?, ?, ?, ?)
  `);

  insertGuideline.run(
    'identity',
    '신원 확인 지침',
    '대표자 및 실소유자의 신원을 확인합니다.\n\n확인 항목:\n1. 사업자등록증 상 대표자와 실제 운영자 일치 여부\n2. 금융범죄, 사기, 횡령 등 형사 처벌 이력\n3. 과거 불법 영업 행정처분 이력\n4. 신용정보 조회 결과 (개인 및 법인)\n\n고위험 판단 기준:\n- 금융범죄 전력 보유\n- 행정처분 이력 2회 이상\n- 신용도 심각 불량 (7등급 이하)',
    '2026-01-01 00:00:00'
  );

  insertGuideline.run(
    'industry',
    '업종 위험도 지침',
    '가맹점이 영위하는 업종의 위험도를 평가합니다.\n\n저위험 업종: 일반 소매, 음식점, 교육, 의료\n중위험 업종: C2C 중개, 여행, 숙박, 중고차 거래\n고위험 업종: 대부업, 가상자산, 성인 콘텐츠, 경품/도박, 해외송금\n\n확인 항목:\n1. 업종 분류 코드 (한국표준산업분류)\n2. 관련 인허가 취득 여부\n3. 동종 업종 평균 분쟁 발생률\n\n고위험 판단 기준:\n- 금융위원회 등록 필수 업종 미등록\n- 청소년 유해 업종 심의 미완료\n- 불법 도박 또는 사행성 서비스 제공 의심',
    '2026-01-01 00:00:00'
  );

  insertGuideline.run(
    'reputation',
    '평판 조회 지침',
    '가맹 신청 업체의 온라인 평판과 민원 이력을 조회합니다.\n\n조회 채널:\n1. 공정거래위원회 소비자 민원 시스템\n2. 한국소비자원 피해구제 신청 현황\n3. 포털 뉴스 및 소비자 커뮤니티\n4. SNS 부정 언급 현황\n\n저위험: 민원 월 5건 미만, 부정 뉴스 없음\n중위험: 민원 월 5~20건, 처리율 80% 이상\n고위험: 민원 월 20건 초과, 언론 부정 보도 또는 집단 피해 발생\n\n주의: 민원 건수보다 처리율과 해결 방식이 중요합니다.',
    '2026-01-01 00:00:00'
  );

  insertGuideline.run(
    'documents',
    '서류 검토 지침',
    '가맹 신청 시 제출한 서류의 유효성과 완전성을 검토합니다.\n\n필수 서류:\n1. 사업자등록증 (유효기간 내)\n2. 통장 사본 (법인/대표자 명의 일치)\n3. 신분증 사본 (대표자)\n\n업종별 추가 서류:\n- 금융업: 금융위원회 등록증\n- 의료업: 보건복지부 허가증\n- 교육업: 교육부 신고필증\n- 성인 콘텐츠: 정보통신윤리위원회 심의 확인서\n\n서류 미비 판단 기준:\n- 필수 서류 1개 이상 미제출: 즉시 반려\n- 업종별 추가 서류 미제출: 추가 소명 요청\n- 서류 위변조 의심: 전문 심사 의뢰',
    '2026-01-01 00:00:00'
  );

  insertGuideline.run(
    'judgment',
    '최종 심사 판단 기준',
    '4개 관점(신원·업종·평판·서류) 심사 결과를 종합하여 최종 판단합니다.\n\nWorst-wins 원칙:\n- 4개 관점 중 가장 높은 위험 등급을 전체 위험 등급으로 결정\n- 단, 1개 관점이 고위험이더라도 나머지가 모두 저위험이면 추가 소명 후 재심사 가능\n\n최종 결정 기준:\n승인 (approved): 전 관점 저위험\n추가 소명 (need_info): 중위험 관점 존재, 고위험 없음\n거절 (rejected): 고위험 관점 1개 이상\n\n예외 사항:\n- 대부업 미등록: 자동 거절\n- 불법 도박 확인: 자동 거절\n- 대표자 금융사기 전력: 자동 거절\n\n최종 결정은 반드시 담당자 서명과 함께 기록합니다.',
    '2026-01-01 00:00:00'
  );

  // 설정 삽입
  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('reviewer_name', '홍길동');
}
