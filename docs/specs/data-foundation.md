# Spec — data-foundation

> PRD 기능 1. 전체 시스템의 데이터 토대: 스키마·타입·설정·시드. 다른 모든 기능이 이 위에서 동작한다.

## Problem Statement

심사자는 가맹점·분석·기준 데이터가 일관된 형태로 저장되고, 처음 켰을 때 빈 화면 대신 바로 둘러볼 수 있는 예시가 있기를 바란다. 개발자 관점에선 모든 기능이 같은 데이터 정의(스키마·타입)를 공유해야 서로 어긋나지 않는다.

## Solution

앱이 시작될 때 SQLite에 4개 테이블(가맹점·분석·가이드라인·설정)을 자동 생성하고, 모든 기능이 공유하는 타입을 한 파일에서 단일 관리한다. DB가 비어 있으면 첫 실행 시 데모 가맹점·완료 분석·기본 가이드라인·심사자명을 자동으로 채워, 켜자마자 대시보드·목록·상세가 채워진 상태로 보인다.

## User Stories

1. As a 심사자, I want 앱을 처음 켜면 예시 가맹점과 분석이 이미 보이기, so that 빈 화면 앞에서 막막하지 않고 기능을 바로 이해할 수 있다.
2. As a 심사자, I want 데모 데이터가 저/중/고위험이 섞여 있기, so that 다양한 위험등급이 화면에서 어떻게 보이는지 한 번에 확인할 수 있다.
3. As a 심사자, I want 데모 데이터 중 일부는 아직 분석 전(대기) 상태이기, so that "새 분석 실행" 흐름도 바로 시험해 볼 수 있다.
4. As a 심사자, I want 기본 심사 기준(관점별 지침)이 처음부터 채워져 있기, so that 기준을 직접 쓰지 않아도 즉시 분석을 돌릴 수 있다.
5. As a 심사자, I want 내 이름(심사자명)이 설정값으로 저장되기, so that 내가 내린 결정에 자동으로 결정자가 기록된다.
6. As a 개발자, I want 모든 타입이 한 파일에 정의되기, so that 기능 간 데이터 형태가 어긋나지 않는다.
7. As a 개발자, I want 앱 시작 시 스키마가 자동 적용되기, so that 별도 마이그레이션 절차 없이 동작한다.
8. As a 심사자, I want 이미 데이터가 있을 때는 시드가 다시 돌지 않기, so that 내가 입력한 진짜 데이터가 데모 데이터로 덮이지 않는다.
9. As a 개발자, I want 분석 레코드가 관점별 결과·종합등급·권고·사람 최종결정을 모두 담는 한 행이기, so that 한 건의 심사가 하나의 감사 단위로 보존된다.
10. As a 심사자, I want 가맹점이 분석과 분리된 영속 엔티티이기, so that 같은 가맹점에 여러 번의 분석 이력이 쌓일 수 있다.

## Implementation Decisions

- **테이블 4종** (`schema.sql`, `getDB()`가 시작 시 자동 실행). 스키마는 결정을 정확히 인코딩하므로 인라인한다:

```sql
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
  status TEXT NOT NULL DEFAULT 'pending',      -- pending | running | completed | failed
  risk_grade TEXT,                             -- low | medium | high (완료 시)
  recommendation TEXT,                         -- approved | rejected | need_info (완료 시)
  perspectives TEXT,                           -- JSON: PerspectiveResult[]
  report TEXT,                                 -- 종합 보고서 서술
  final_decision TEXT,                         -- approved | rejected | need_info (사람 결정 시)
  decision_memo TEXT,
  decided_by TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS guidelines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,                     -- identity | industry | reputation | documents | judgment
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

- **공용 타입** (`types/index.ts` 단일 관리). 타입 셰이프도 결정 인코딩이므로 인라인:

```typescript
export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';
export type RiskLevel = 'low' | 'medium' | 'high';        // 관점별 & 종합등급 공용
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
```

- **시드 규칙**: `getDB()` 초기화 직후 `merchants` 행 수가 0이면 시드 실행(개발 서버 시작 시 자동, 이미 데이터가 있으면 건너뜀 — 최근 커밋의 자동 시드 패턴과 동일). 시드 내용:
  - 가맹점 6건: 저/중/고위험을 유도하는 다양한 업종(예: 일반 소매, 온라인 교육 / 중고거래 중개 / 대부·도박성 의심 업종 등) 섞기.
  - 그중 3~4건은 `status='completed'`로 관점별 결과·등급·권고·보고서까지 채운 분석을 함께 시드(대시보드/목록/상세가 즉시 채워지도록), 1~2건은 `status='pending'`(실행 흐름 시험용).
  - 가이드라인 5건(`identity`/`industry`/`reputation`/`documents`/`judgment`) 기본 지침 텍스트.
  - 설정 1건: `reviewer_name` = 기본 심사자명.
- **설정 접근**: `settings`는 key/value. `reviewer_name`을 `decided_by` 기본값으로 사용. (`risk-analysis-engine`/`analysis-detail-and-decision`/`guideline-management`가 이 토대를 공유)
- 시드 로직은 `lib/db.ts` 또는 분리된 시드 모듈에서 `getDB()` 호출 경로에 포함되어 서버 시작 시 1회 보장.

## Out of Scope

- 마이그레이션 도구/버전 관리(스키마는 `CREATE TABLE IF NOT EXISTS`로 단순 적용).
- 가이드라인 변경 이력 보관(편집은 덮어쓰기 — `guideline-management` 참조).
- 데이터 마스킹/PII 처리(내부 단일 사용자, 법인 정보 대상이라 불필요).

## Further Notes

- `RiskLevel`을 관점별 위험도와 종합등급에 공용으로 쓴다(저/중/고 = low/medium/high). 화면 표기만 한국어로 매핑.
- `perspectives`는 JSON 문자열로 저장하고 읽을 때 파싱한다(SQLite에 배열 타입 없음).
- 분석 1행이 곧 감사 단위: AI 산출(등급·권고·관점·보고서)과 사람 산출(final_decision·memo·decided_by·decided_at)이 같은 행에 분리 컬럼으로 공존.
