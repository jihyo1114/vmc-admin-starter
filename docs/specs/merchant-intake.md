# Spec — merchant-intake

> PRD 기능 2. 새 분석을 시작하는 입력 흐름.

## Problem Statement

심사자는 새로 들어온 가맹점을 심사하려 한다. 그러려면 가맹점의 기본 정보를 시스템에 넣어야 하는데, 처음 보는 가맹점일 수도 있고 예전에 분석한 적 있는 가맹점을 재심사하는 경우일 수도 있다. 입력은 빠르고 단순해야 하며, 같은 가맹점을 매번 새로 만들어 중복이 쌓이는 일은 피하고 싶다.

## Solution

"새 분석" 화면에서 심사자가 가맹점 정보(상호명·사업자번호·대표자명·업종·주소·제출서류 자유텍스트)를 입력하면 새 가맹점과 그에 딸린 분석(대기 상태)이 만들어진다. 기존 가맹점을 재심사할 때는 목록에서 그 가맹점을 골라 곧바로 새 분석을 생성한다. 생성 직후 분석 상세 화면으로 이동해 바로 실행할 수 있다.

## User Stories

1. As a 심사자, I want 새 분석 화면에서 가맹점 정보를 한 폼에 입력하기, so that 한 번에 심사 대상을 등록할 수 있다.
2. As a 심사자, I want 상호명·사업자번호·업종을 필수로 입력하기, so that 분석에 꼭 필요한 정보가 빠지지 않는다.
3. As a 심사자, I want 대표자명을 입력하기, so that 신원확인 관점이 대표자 정보를 근거로 판단할 수 있다.
4. As a 심사자, I want 주소와 제출서류/정보를 자유 텍스트로 입력하기, so that 가진 정보를 형식 제약 없이 그대로 넣을 수 있다.
5. As a 심사자, I want 제출서류 칸에 신청서·통화내용 등 어떤 텍스트든 붙여넣기, so that 서류 정합성 관점이 검토할 재료를 줄 수 있다.
6. As a 심사자, I want 예전에 분석한 가맹점을 목록에서 선택하기, so that 같은 가맹점을 중복 생성하지 않고 재심사할 수 있다.
7. As a 심사자, I want 기존 가맹점을 고르면 그 가맹점의 정보가 채워진 채로 새 분석이 생성되기, so that 정보를 다시 타이핑하지 않아도 된다.
8. As a 심사자, I want 분석 생성 직후 분석 상세 화면으로 이동하기, so that 곧바로 분석을 실행할 수 있다.
9. As a 심사자, I want 필수 항목이 비면 저장이 막히고 안내받기, so that 잘못된 입력으로 분석이 실패하지 않는다.
10. As a 심사자, I want 사업자번호를 자유 형식으로 넣되 너무 엉뚱하면 가벼운 안내를 받기, so that 오타를 줄이면서도 입력이 번거롭지 않다.
11. As a 심사자, I want 분석을 만들면 가맹점이 영속적으로 저장되기, so that 이후 그 가맹점의 이력이 쌓인다.

## Implementation Decisions

- **화면**: `/analyses/new` (Presentation). 두 모드 — (a) 신규 가맹점 입력 폼, (b) 기존 가맹점 선택. 같은 화면 내 탭/토글로 전환.
- **기존 가맹점 선택용 조회**: `GET /api/merchants` — 가맹점 목록(id·상호명·사업자번호·업종) 반환. 선택 시 `merchant_id`만 보내면 그 가맹점에 새 분석을 단다.
- **생성 API**: `POST /api/merchants` (Application). 두 경우를 한 엔드포인트로 처리:
  - 신규: body `{ name, business_number, representative, category, address, submitted_docs }` → 가맹점 INSERT 후 그 id로 분석(`status='pending'`) INSERT.
  - 기존: body `{ merchant_id }` (+선택적으로 갱신 필드) → 해당 가맹점에 분석(`status='pending'`) INSERT.
  - 응답: `{ analysisId }`.
- **입력 검증**: `name`·`business_number`·`category` 필수(서버·클라이언트 양쪽). 사업자번호는 문자열로 저장하되 클라이언트에서 숫자 10자리 형식 힌트 수준의 가벼운 안내(차단은 필수 3종만).
- **생성 후 이동**: 응답의 `analysisId`로 `/analyses/[id]`로 라우팅. 실제 분석 실행은 `risk-analysis-engine`이 담당.
- **데이터**: `merchants`는 영속(`data-foundation` 스키마). 기존 가맹점 재심사는 같은 `merchant_id`에 새 `analyses` 행을 만들어 1:N 이력을 형성.

## Out of Scope

- 분석 실행/진행 표시(→ `risk-analysis-engine`).
- 가맹점 정보 사후 편집 화면(이번 범위는 "분석 생성 시점의 입력"에 한정).
- 파일 업로드/문서 파싱(수동 텍스트 입력만).
- 가맹점 중복 자동 감지/병합(사업자번호 기준 dedupe는 v1 제외, 선택 UI로 중복을 줄이는 선에서 그침).

## Further Notes

- sample의 `POST /api/merchants`는 신규 생성만 했는데, 1:N 이력(완료 건 재심사 시 새 레코드)을 위해 기존 가맹점 선택 경로를 추가한다.
- `category`는 자유 입력 또는 흔한 업종 프리셋 + 직접입력 혼합 가능(고위험 업종 판단은 `industry` 관점이 텍스트로 수행하므로 코드 분류는 불필요).
