# Spec — guideline-management

> PRD 기능 7. 관점별 심사 기준(분석 지침)을 화면에서 편집.

## Problem Statement

회사의 위험 판단 기준은 시간이 지나며 바뀐다(새 고위험 업종 추가, 신원 확인 항목 강화 등). 이때마다 개발자가 코드를 고쳐 배포해야 한다면 운영이 경직된다. 심사자가 직접 "각 관점이 무엇을 어떻게 보는지"를 조정할 수 있어야 분석 품질을 통제할 수 있다.

## Solution

가이드라인 화면에서 5개 항목(신원확인·업종위험도·평판·서류 정합성·종합판정)의 지침 텍스트를 읽고 편집해 저장한다. 저장하면 다음 분석부터 그 지침이 각 관점 에이전트의 프롬프트에 반영된다. 코드 수정·배포 없이 운영자가 기준을 바꿀 수 있다.

## User Stories

1. As a 심사자, I want 가이드라인 화면에서 5개 관점 지침을 모두 보기, so that 현재 어떤 기준으로 분석되는지 안다.
2. As a 심사자, I want 각 지침의 제목과 본문을 편집하기, so that 우리 회사 기준에 맞게 조정한다.
3. As a 심사자, I want 업종위험도 지침에 새 고위험 업종을 추가하기, so that 최신 정책이 분석에 반영된다.
4. As a 심사자, I want 신원확인 지침에 확인 항목을 강화하기, so that 더 엄격히 심사한다.
5. As a 심사자, I want 종합판정 지침을 조정하기, so that 종합 보고서 서술의 관점을 통제한다.
6. As a 심사자, I want 저장하면 즉시 반영되고 다음 분석부터 적용되기, so that 변경 효과를 바로 본다.
7. As a 심사자, I want 저장 시각이 기록·표시되기, so that 기준이 언제 바뀌었는지 안다.
8. As a 심사자, I want 지침을 비우거나 잘못 저장하는 실수를 방지받기, so that 분석이 빈 기준으로 망가지지 않는다.
9. As a 심사자, I want 처음부터 기본 지침이 채워져 있기, so that 아무것도 안 써도 분석이 동작한다.
10. As a 심사자, I want 편집 중 저장하지 않고 떠나도 기존 값이 유지되기, so that 실수로 덮어쓰지 않는다.

## Implementation Decisions

- **화면**: `/guidelines` (Presentation). 5개 항목(`identity`/`industry`/`reputation`/`documents`/`judgment`)을 각각 제목+본문 편집 폼으로 렌더.
- **조회 API**: `GET /api/guidelines` — 전체 가이드라인(`Guideline[]`) 반환.
- **저장 API**: `PATCH /api/guidelines/[key]` — body `{ title, content }`, upsert(`ON CONFLICT(key)` 갱신 + `updated_at` 현재시각). key 단위로 개별 저장.
- **기본값/연동**: `data-foundation` 시드가 5개 기본 지침을 채운다. `risk-analysis-engine`은 분석 시 `guidelines`에서 각 관점 지침을 읽어 프롬프트에 주입하고, 값이 없으면 코드 기본 지침으로 폴백.
- **검증**: 제목·본문 비어있으면 저장 차단(클라이언트+서버). 기존 값 보존(저장 전까지 미반영).
- **관점-키 매핑**: `identity`=신원확인, `industry`=업종위험도, `reputation`=평판/부정이력, `documents`=제출서류 정합성, `judgment`=종합판정. (관점 4개 + 종합 1개)

## Out of Scope

- 변경 이력/버전 관리·롤백(편집은 덮어쓰기, 마지막 값만 유지).
- 결정규칙(worst-wins) 임계값 자체의 UI 편집(규칙은 코드 고정; 지침 텍스트만 편집).
- 관점 추가/삭제(관점 집합은 고정 5종).
- 가이드라인별 권한 분리(단일 운영자).

## Further Notes

- 지침 텍스트는 각 관점 에이전트 프롬프트에 그대로 삽입되므로, 운영자가 쓰는 자연어가 곧 분석 행동을 바꾼다.
- worst-wins 규칙은 코드에서 결정적으로 계산되며 가이드라인 편집의 영향을 받지 않는다(지침은 관점별 판단의 "내용"만 조정, 등급 산출 "방식"은 불변).
