# Spec — risk-analysis-engine

> PRD 기능 3. 핵심 AI 에이전트. 4개 관점 병렬 실행 + worst-wins 규칙 + 안전강등 + 부분실패 격리 + 종합 보고서.

## Problem Statement

심사자는 가맹점 한 곳을 여러 위험 관점에서 꼼꼼히 보고 싶지만, 사람이 신원·업종·평판·서류를 일일이 따져 일관된 등급을 매기는 건 느리고 들쭉날쭉하다. 또 AI가 "그냥 결론만" 던지면 신뢰하기 어렵다 — 관점별로 무엇을 근거로, 어떻게 일하는지가 보여야 하고, 같은 입력엔 같은 규칙으로 등급이 나와야 한다.

## Solution

분석을 실행하면 4개 관점(신원확인·업종위험도·평판/부정이력·제출서류 정합성) 에이전트가 **동시에** 돌고, 각 관점이 끝나는 즉시 화면에 "○○ 관점 완료 — 위험도"가 실시간으로 뜬다. 4개가 끝나면 종합판정 에이전트가 근거 보고서를 쓰고, 시스템은 **정해진 규칙(worst-wins)**으로 종합 위험등급과 권고(승인/거절/추가정보)를 결정적으로 산출한다. 한 관점이 실패해도 나머지로 진행하되, 실패·누락이 있으면 절대 '승인'으로 가지 않는다(안전강등).

## User Stories

1. As a 심사자, I want 분석을 실행하면 4개 관점이 동시에 돌기, so that 한 관점씩 기다리지 않고 빨리 결과를 받는다.
2. As a 심사자, I want 각 관점이 끝날 때마다 실시간으로 완료 표시와 위험도가 뜨기, so that AI가 일하는 과정을 신뢰하며 지켜볼 수 있다.
3. As a 심사자, I want 관점별로 "무엇을 근거로 그 위험도를 줬는지" findings를 보기, so that 결과를 검증하고 설명할 수 있다.
4. As a 심사자, I want 신원확인 관점이 사업자번호·대표자·설립 정합성과 이상 징후를 보기, so that 허위 신원을 걸러낼 수 있다.
5. As a 심사자, I want 업종위험도 관점이 도박·성인·대부·가상자산 등 고위험/금칙 업종 여부를 판단하기, so that 받으면 안 되는 업종을 식별한다.
6. As a 심사자, I want 평판 관점이 상호·사업자 기반 부정 이력·사기 가능성을 검토하기, so that 알려진 위험 신호를 본다.
7. As a 심사자, I want 서류 정합성 관점이 제출 정보와 입력 정보의 일치·누락을 검토하기, so that 서류 위·변조나 빈틈을 잡는다.
8. As a 심사자, I want 4개 관점 후 종합판정 에이전트가 근거 보고서를 쓰기, so that 전체 맥락이 정리된 소견을 얻는다.
9. As a 심사자, I want 종합 위험등급과 권고가 정해진 규칙으로 일관되게 나오기, so that 같은 입력에 사람마다 다른 결론이 나오지 않는다.
10. As a 심사자, I want 어느 관점이든 high면 종합이 고위험/거절 권고가 되기, so that 강한 위험 신호가 묻히지 않는다.
11. As a 심사자, I want 한 관점이 오류로 실패해도 나머지 관점은 결과가 나오기, so that 한 번의 일시적 실패로 전부 날리지 않는다.
12. As a 심사자, I want 실패하거나 빠진 관점이 있으면 절대 자동 '승인'이 되지 않기, so that 정보가 불완전한 채로 통과되지 않는다.
13. As a 심사자, I want 실패한 관점이 "분석불가"로 명확히 표시되기, so that 무엇을 다시 봐야 하는지 안다.
14. As a 심사자, I want 분석 도중 상태가 '실행중'으로 바뀌고 완료/실패로 마무리되기, so that 진행 상황을 추적할 수 있다.
15. As a 심사자, I want 분석에 쓰이는 관점별 지침이 가이드라인 설정을 따르기, so that 우리 회사 기준이 분석에 반영된다.
16. As a 심사자, I want 결과(관점·등급·권고·보고서)가 분석 레코드에 저장되기, so that 나중에 다시 열어도 그대로 남아 있다.

## Implementation Decisions

- **실행 API**: `POST /api/analyses/[id]/run` (Application), `text/event-stream` 응답. 시작 시 분석 `status='running'`로 갱신.
- **에이전트 호출**: 관점 4개는 각각 별도 `claude -p` 서브프로세스로 **병렬**(`Promise.all` 패턴) 실행. 종합판정은 4개 완료 후 별도 1회 호출 → 분석 1건당 총 5회.
- **관점별 프롬프트**: 각 관점 프롬프트 = 가맹점 정보 + 해당 관점의 가이드라인 지침(`guidelines` 테이블의 `identity`/`industry`/`reputation`/`documents`; 없으면 코드 기본 지침). 각 관점은 자신의 결과를 JSON으로 반환: `{ findings, risk_level }`. 관점별로 독립 호출이므로 한 관점의 JSON 깨짐이 다른 관점에 영향 없음.
- **종합판정 프롬프트**: 4개 관점 findings를 모아 종합판정(`judgment`) 지침과 함께 전달 → **서술 보고서 텍스트만** 생성(등급·권고는 LLM이 정하지 않음).
- **결정규칙(worst-wins, 서버에서 결정적 계산)** — 프로토타입에서 확정된 매핑:

```
risk_grade =
  관점 중 하나라도 high            → 'high'   (고위험)
  high 없고 medium 하나라도 있음   → 'medium' (중위험)
  전부 low                          → 'low'    (저위험)

recommendation =
  high   → 'rejected'   (거절)
  medium → 'need_info'  (추가정보필요)
  low    → 'approved'   (승인)
```

- **안전강등**: 실패(`status='failed'`)했거나 누락된 관점이 하나라도 있으면, 위 규칙으로 계산한 `recommendation`이 'approved'여도 **'need_info'로 강등**하고 `risk_grade`는 최소 'medium' 이상으로 본다. 즉 불완전 분석은 절대 승인 권고가 되지 않는다.
- **부분 실패 격리**: 각 관점 결과는 `PerspectiveResult { key, title, findings, risk_level, status }`로 저장. 실패 관점은 `status='failed'`, `findings`에 실패 사유, `risk_level`은 등급 계산에서 제외(단 안전강등 트리거). 4개가 모두 실패한 경우에만 분석 `status='failed'`.
- **SSE 이벤트 계약** (프로토타입에서 확정):
  - `event: perspective_start` `data: { key, title }` — 관점 시작
  - `event: perspective_done` `data: { key, title, risk_level, status }` — 관점 완료/실패
  - `event: synthesis_start` `data: {}` — 종합판정 시작
  - `event: done` `data: { risk_grade, recommendation, perspectives, report }` — 최종
  - `event: error` `data: "메시지"` — 치명 오류(예: claude 미설치)
- **영속화**: 완료 시 `analyses`의 `status='completed'`, `risk_grade`, `recommendation`, `perspectives`(JSON), `report` 갱신. 사람 최종결정 필드는 건드리지 않음(→ `analysis-detail-and-decision`).
- **재실행 가능 상태**: `pending` 또는 `failed`만 실행 허용(이미 `running`/`completed`면 거부). 완료 건의 재심사는 새 레코드 생성(→ `merchant-intake`).

## Out of Scope

- 실시간 웹 검색/외부 조회(평판은 모델 학습지식 기반 추정).
- 관점별 개별 재시도 버튼(실패 시 분석 전체 재실행으로 처리 — 상세 화면 담당).
- 관점 가중치/관점별 차등 규칙(worst-wins 단일 규칙).
- 점수(0~100) 산출(등급+권고 모델만).

## Further Notes

- sample은 단일 `claude -p` 1회 + JSON 정규식 파싱이었다. 본 기능은 이를 **관점별 병렬 멀티에이전트 + 종합 1회**로 확장하는 것이 핵심 신규 작업이다.
- 로컬 단일 사용자 전제이므로 동시 5개 프로세스 부하는 허용. 한 건당 수십 초~1분 소요.
- 등급·권고를 코드가 결정적으로 계산하므로 LLM 출력이 흔들려도 같은 관점 위험도 → 같은 등급이 보장된다(감사·일관성).
