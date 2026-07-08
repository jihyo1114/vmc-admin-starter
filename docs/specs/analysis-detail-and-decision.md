# Spec — analysis-detail-and-decision

> PRD 기능 4. 분석 상세 화면 + 사람 최종결정 기록 + 보고서 인쇄/PDF.

## Problem Statement

심사자는 AI 분석 결과를 한 화면에서 충분히 검토하고, 그것을 참고해 **자신의 최종 결정**을 내려 기록으로 남겨야 한다. AI가 권고만 하고 사람의 결정이 어디에도 안 남으면 "누가, 왜 승인/거절했는가"가 감사되지 않는다. 또 심사 결과를 회사 기록으로 보관하려면 인쇄·PDF로 떨어뜨릴 수 있어야 한다.

## Solution

분석 상세 화면은 가맹점 정보, 관점별 위험도·근거, 종합 위험등급·권고, 종합 보고서를 보여준다. 실행 전이면 "분석 실행" 버튼으로 실시간 진행을 띄우고, 완료되면 결과를 정리해 보여준다. 심사자는 AI 권고와 별개로 **최종 결정(승인/거절/추가정보)과 메모**를 남기고, 그 결정은 결정자명·시각과 함께 저장된다. 보고서는 한 번의 클릭으로 인쇄/PDF 저장할 수 있다. 실패한 분석은 재실행, 완료된 분석은 재심사(새 레코드)로 이어갈 수 있다.

## User Stories

1. As a 심사자, I want 분석 상세에서 가맹점 정보와 4개 관점 결과를 한눈에 보기, so that 결정을 내리기 전 전체를 검토한다.
2. As a 심사자, I want 아직 실행 안 한 분석에서 "분석 실행"을 누르기, so that 이 화면에서 바로 분석을 시작한다.
3. As a 심사자, I want 실행 중 관점별 완료가 실시간으로 채워지는 걸 보기, so that 진행을 신뢰하며 기다린다.
4. As a 심사자, I want 종합 위험등급과 AI 권고가 눈에 띄게 표시되기, so that 핵심 결론을 즉시 파악한다.
5. As a 심사자, I want 관점별 findings를 펼쳐 읽기, so that 근거를 검증한다.
6. As a 심사자, I want 종합 보고서 서술을 읽기, so that 맥락이 담긴 소견을 본다.
7. As a 심사자, I want 실패한 관점이 "분석불가"로 표시되고 재실행할 수 있기, so that 일시 오류를 복구한다.
8. As a 심사자, I want AI 권고와 분리된 칸에서 내 최종 결정을 고르기, so that 사람 책임 결정이 명확히 남는다.
9. As a 심사자, I want 최종 결정에 메모를 적기, so that 결정 이유를 기록한다.
10. As a 심사자, I want 최종 결정에 결정자명과 결정일이 자동 기록되기, so that 감사 추적이 가능하다.
11. As a 심사자, I want 내 결정이 AI 권고와 달라도 그대로 저장되기, so that 사람의 판단이 우선될 수 있다.
12. As a 심사자, I want 이미 결정한 분석을 다시 열면 결정 내용이 보존돼 보이기, so that 과거 결정을 확인한다.
13. As a 심사자, I want 보고서를 인쇄/PDF로 저장하기, so that 회사 기록으로 보관한다.
14. As a 심사자, I want 인쇄본에 가맹점·등급·권고·관점별 결과·보고서·최종결정이 정돈돼 담기기, so that 보고서 한 장으로 심사 근거가 완결된다.
15. As a 심사자, I want 완료된 분석을 "재심사"하면 새 분석 레코드가 생기기, so that 과거 판정을 지우지 않고 다시 본다.
16. As a 심사자, I want 해당 가맹점의 이력으로 이동하는 링크가 있기, so that 같은 가맹점의 과거 분석을 본다.

## Implementation Decisions

- **화면**: `/analyses/[id]` (Presentation). 상태별 분기:
  - `pending`/`failed` → "분석 실행" CTA (실행 시 `risk-analysis-engine`의 SSE 소비, 관점별 진행 실시간 렌더).
  - `running` → 진행 표시.
  - `completed` → 결과 + 최종결정 패널 + 인쇄 버튼.
- **데이터 조회**: `GET /api/analyses/[id]` — 분석 + 조인된 가맹점 정보(`AnalysisWithMerchant`). `perspectives` JSON 파싱.
- **실행 연동**: `POST /api/analyses/[id]/run`(SSE) 소비. SSE 이벤트(`perspective_start`/`perspective_done`/`synthesis_start`/`done`/`error`)에 따라 관점 카드와 종합 결과를 점진적으로 채움. (계약은 `risk-analysis-engine` 스펙)
- **최종결정 API**: `PATCH /api/analyses/[id]` (Application). body `{ final_decision, decision_memo }` → `final_decision`·`decision_memo` 저장, `decided_by`는 `settings.reviewer_name`에서 자동 채움, `decided_at`은 서버 현재시각. 결정은 덮어쓰기 허용(다시 결정 가능, 항상 마지막 결정·시각 기록).
- **결정 패널 UX**: AI 권고(`recommendation`)는 읽기 전용으로 표시, 그 아래 사람 결정 셀렉트(승인/거절/추가정보) + 메모 입력 + 저장. 저장 후 결정자/결정일 표시. (사유 필수화는 하지 않음 — 메모 권장 수준)
- **인쇄/PDF**: 별도 라이브러리 없이 print 전용 CSS로 상세 화면의 보고서 영역을 인쇄 레이아웃으로 렌더 → 브라우저 인쇄→PDF 저장. 인쇄 영역에 가맹점·종합등급/권고·관점별 결과·보고서·최종결정/결정자/결정일 포함.
- **재심사**: 완료 분석에서 "재심사" → `merchant-intake`의 `POST /api/merchants`에 해당 `merchant_id`로 새 분석(`pending`) 생성 후 그 상세로 이동(새 레코드, 1:N 이력).
- **상태 색상**: 기존 `Badge` 컴포넌트 재사용. 위험등급/권고/관점 위험도에 색 매핑(저=green, 중=yellow, 고=red 계열; 승인/거절/추가정보 대응).

## Out of Scope

- 분석 실행 로직 자체(→ `risk-analysis-engine`).
- 목록/이력 화면(→ `analysis-browsing`).
- 결정 사유 필수화·결정 승인 워크플로(2차 결재) — v1 제외.
- 정식 PDF 생성 엔진(브라우저 인쇄로 대체).

## Further Notes

- AI 산출과 사람 산출을 같은 분석 행의 **분리된 컬럼**에 두는 것이 이 기능의 감사 핵심(`final_decision` vs `recommendation`).
- 인쇄 레이아웃은 화면 UI와 다른 print CSS를 쓰되 같은 데이터를 재사용한다.
