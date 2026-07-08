## Problem Statement

심사자가 시스템에 접속했을 때 두 가지 질문에 즉시 답을 얻지 못한다.

1. **"지금 내가 처리해야 할 건이 무엇인가?"** — 기존 대시보드는 KPI 숫자(미결정 N건, 고위험 N건)를 보여주지만, 어떤 건인지·얼마나 기다렸는지·어느 게 더 급한지를 한눈에 알 수 없다. 목록 페이지를 별도로 열고 필터를 조작해야 한다.

2. **"이 분석 결과를 보고 어떻게 결정할까?"** — 기존 상세 페이지는 보고서·관점 카드·결정 폼이 단일 컬럼으로 쌓여 있어, 긴 보고서를 스크롤한 뒤에야 결정 입력란에 닿는다. 결정을 입력하는 도중 위험도나 AI 권고를 다시 확인하려면 위로 다시 스크롤해야 한다.

## Solution

화면을 "심사자의 의사결정 단위"로 재구성한다.

- **대시보드 검토 대기 큐**: 홈 화면 상단에 미결정 완료 건을 위험도 우선으로 정렬한 컴팩트 목록을 추가해, 접속 즉시 "지금 처리해야 할 건"을 파악하게 한다.
- **상세 페이지 2-column 레이아웃**: 분석 내용을 좌측 스크롤 영역에 두고, 우측에 위험도·AI 권고 요약과 결정 폼을 sticky로 배치해 콘텐츠를 읽는 내내 결정 UI에 접근 가능하게 한다.

## User Stories

1. As a compliance reviewer, I want to see a prioritized list of pending analyses on the dashboard, so that I know which cases to handle first without navigating away.
2. As a compliance reviewer, I want pending analyses sorted by risk level (high first), so that the most urgent cases are always at the top.
3. As a compliance reviewer, I want to see how long each case has been waiting, so that I can judge urgency alongside risk.
4. As a compliance reviewer, I want to see the AI recommendation alongside risk grade in the queue, so that I can pre-judge severity before opening the case.
5. As a compliance reviewer, I want the queue to show at most 5 cases with a "전체 보기" link, so that the dashboard remains compact and focused.
6. As a compliance reviewer, I want the queue to disappear when there are no pending cases, so that the dashboard stays clean.
7. As a compliance reviewer, I want to click a queue row to go directly to the analysis detail, so that I can start reviewing immediately.
8. As a compliance reviewer, I want to see a summary card at the top of the detail page showing the risk grade, AI recommendation, and the key finding in one line, so that I can grasp the conclusion before reading the full report.
9. As a compliance reviewer, I want the merchant's submitted information to appear before the AI analysis detail, so that I understand who I'm reviewing before judging the AI's findings.
10. As a compliance reviewer, I want to see all four AI perspective cards and the synthesis report in the main content area, so that I can read the full analysis in a natural reading order.
11. As a compliance reviewer, I want the decision panel to remain visible on the right side while I scroll through the analysis report, so that I can make a decision at any point without scrolling back up.
12. As a compliance reviewer, I want the decision panel to display the risk grade and AI recommendation as badges, so that the key signals are always visible alongside the decision form.
13. As a compliance reviewer, I want to select a final decision (승인/거절/추가정보) from the sticky panel, so that I can record my judgment while the evidence is still on screen.
14. As a compliance reviewer, I want to add a memo explaining my decision, so that the rationale is recorded for audit.
15. As a compliance reviewer, I want to see the decision save button in the sticky panel with a loading state, so that I know when the save is in progress.
16. As a compliance reviewer, I want to see the confirmed decision, reviewer name, and timestamp in the sticky panel after saving, so that I can verify what was recorded.
17. As a compliance reviewer, I want a success modal to appear after saving a decision, so that I get clear confirmation that the record was updated.

## Implementation Decisions

### Dashboard Pending Queue

- The dashboard API (`GET /api/dashboard`) is extended with a `pending_queue` field: top 5 completed analyses with `final_decision IS NULL`, sorted by `risk_grade` (high → medium → low, via SQL CASE WHEN), then `created_at ASC` (oldest wait first within same risk tier).
- Each queue item carries: `id`, `merchant_name`, `merchant_category`, `risk_grade`, `recommendation`, `created_at`.
- Wait time is derived client-side from `created_at` using a relative-time formatter (e.g. "3시간 전", "2일 전").
- The queue section renders only when `pending_queue.length > 0` — it is invisible when all cases are decided.
- The queue links to `GET /analyses` for "전체 보기".
- A new `PendingQueueItem` type is added to `types/index.ts`; `MerchantDashboard` is extended with `pending_queue: PendingQueueItem[]`.

### Detail Page 2-Column Layout (completed status only)

- Layout: `flex gap-6 items-start` wrapper. Left column: `flex-1 min-w-0`, right column: `w-72 shrink-0`.
- Right column uses `sticky top-6` so the panel stays on screen during scroll.
- The right panel is hidden in print mode (`no-print` class).

**Left column content order:**
1. Summary card — risk grade badge + recommendation badge + first non-empty line of the synthesis report (`line-clamp-2`).
2. Merchant info card — same `MerchantInfoCard` component as before (name, business number, representative, category, address, submitted docs).
3. AI 다각도 분석 — section heading + 2-column grid of 4 perspective cards (신원 확인, 업종 위험도, 평판 조회, 서류 정합성).
4. Synthesis report card.

**Right sticky panel sections:**
1. AI 분석 결과 — risk grade badge + AI recommendation badge (both displayed as `Badge size="md"` with label-value row layout).
2. 최종 결정 form — select (승인/거절/추가정보), textarea (메모), full-width primary save button with spinner loading state.
3. Confirmed decision display (shown after `decided_by` is set) — final decision badge, reviewer name, decided timestamp.

- The success modal (fixed overlay with green check icon) remains unchanged, triggered by `decisionSaved` state.
- The page title changes from "분석 상세" to the merchant name for orientation.
- Page max-width expands from `max-w-3xl` to `max-w-6xl` to accommodate the 2-column layout.
- The pending/failed/running states retain the single-column layout (no sidebar); the 2-column layout applies only to the `completed` status branch.

## Out of Scope

- Sorting or filtering the pending queue by criteria other than risk grade + wait time.
- Drag-to-reorder or manual priority assignment on the queue.
- Notifications or alerts when new cases enter the queue.
- Mobile-responsive breakpoints for the 2-column layout (designed for desktop reviewers).
- Bulk decision actions from the queue (clicking a row navigates to the detail page; decision is made there).
- Changing the sort order of the queue from the UI.

## Further Notes

- The `pending_queue` data comes from the same `/api/dashboard` endpoint as existing KPI data — no new API route needed.
- The 2-column layout uses only Tailwind utility classes; no new UI components were introduced.
- `Button` component already accepts a `className` prop, so `className="w-full"` achieves the full-width save button without modifying the component.
- The `relativeTime` helper is a pure client-side function; no server-side date formatting needed.
