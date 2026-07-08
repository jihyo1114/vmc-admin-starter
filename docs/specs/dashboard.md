# Spec — dashboard

> PRD 기능 6. 심사자 홈 화면. KPI 카드 4종 + 최근 분석 목록.

## Problem Statement

심사자가 도구를 열었을 때 가장 먼저 알고 싶은 건 "지금 내가 처리해야 할 일이 무엇인가"다. 결정 안 한 건은 몇 개인지, 위험한 건이 얼마나 쌓였는지, 최근 무엇이 처리됐는지가 흩어져 있으면 매번 목록을 뒤져야 한다.

## Solution

대시보드(홈)는 네 개의 KPI 카드 — 미결정 대기·고위험/거절권고·기간별 처리량·권고 분포 — 와 최근 분석 목록을 보여준다. 심사자는 들어오자마자 "할 일"과 전체 위험 현황을 한눈에 파악하고, 카드나 최근 항목을 눌러 바로 해당 화면으로 이동한다.

## User Stories

1. As a 심사자, I want 홈에서 미결정 대기 건수를 보기, so that 내가 결정해야 할 일이 얼마나 남았는지 즉시 안다.
2. As a 심사자, I want 미결정 대기 카드를 누르면 그 건들만 보기, so that 바로 결정 작업으로 들어간다.
3. As a 심사자, I want 고위험/거절권고 건수를 보기, so that 주의가 필요한 가맹점 규모를 파악한다.
4. As a 심사자, I want 기간별(오늘/이번주) 처리량을 보기, so that 업무 진행 속도를 가늠한다.
5. As a 심사자, I want 권고 분포(승인/거절/추가정보 비율)를 보기, so that 전체 심사 패턴을 조망한다.
6. As a 심사자, I want 최근 분석 목록을 보기, so that 방금 무엇이 처리됐는지 확인한다.
7. As a 심사자, I want 최근 분석 항목을 누르면 상세로 가기, so that 곧장 검토한다.
8. As a 심사자, I want KPI가 실제 데이터와 일치하기, so that 숫자를 신뢰한다.
9. As a 심사자, I want 데이터가 없을 때도 0과 안내가 깨지지 않고 보이기, so that 빈 상태에서도 혼란이 없다.
10. As a 심사자, I want 첫 실행 시 시드 데이터로 카드와 목록이 채워져 보이기, so that 대시보드가 어떻게 작동하는지 바로 이해한다.

## Implementation Decisions

- **화면**: `/` (Presentation, 홈). `app/page.tsx`.
- **집계 API**: `GET /api/dashboard` (Application) — 한 번에 KPI + 최근 목록 반환:
  - `pending_decision`: `status='completed'` 이고 `final_decision IS NULL`인 건수(미결정 대기).
  - `high_risk`: `risk_grade='high'` 또는 `recommendation='rejected'`인 건수.
  - `throughput`: 오늘/이번주 `completed` 건수(생성일/완료 기준; 단순화해 `created_at` 기준 집계).
  - `recommendation_dist`: `approved`/`rejected`/`need_info` 카운트.
  - `recent`: 최근 분석 N건(가맹점명·등급·권고·상태·최종결정·생성일).
- **표시 형태**: KPI 4종은 카드(`Card`/`Badge` 재사용). 권고 분포는 간단한 막대/카운트(차트 라이브러리 없이 비율 바). 최근 목록은 `analysis-browsing`의 행과 동일한 표기를 재사용해 일관성 유지.
- **이동**: 미결정/고위험 카드 → `/analyses?filter=...`(또는 동일 필터 상태로 목록 이동). 최근 항목 → `/analyses/[id]`.
- **정의 일치**: "미결정 대기"·"고위험"의 정의를 `analysis-browsing` 필터와 동일하게 맞춰 숫자와 목록이 어긋나지 않게 한다.

## Out of Scope

- 시계열 그래프/고급 차트·기간 커스텀 필터(오늘/이번주 같은 고정 구간만).
- 개인화/위젯 재배치.
- 실시간 자동 갱신(페이지 로드 시 집계; 새로고침으로 갱신).

## Further Notes

- 모든 KPI는 `analyses`(+조인) 단일 집계로 산출되며 별도 통계 테이블을 만들지 않는다.
- 차트 의존성 추가 없이 Tailwind만으로 비율 바를 그려 템플릿 범위를 유지한다.
