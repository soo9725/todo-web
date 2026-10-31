# TODO 웹 앱 작업 규칙

단계 진행, 검증, 안전 같은 공통 규칙은 전역 `CLAUDE.md`를 따른다. 여기에는 이 프로젝트에만 해당하는 것을 적는다.

## 위치
- 계획서는 `docs/plan.md`, 목업은 `docs/mockup-color/`(22개 화면)다.
- `docs/private.md`는 git에서 제외된 비공개 메모다. 푸시하지 않는다.

## 이 프로젝트의 추가 규칙
- 계획서와 목업이 충돌하면 멈추고 사용자에게 묻는다.
- 목업이나 파일의 변형은 복사본으로 만들고 원본은 고치지 않는다.

## 검사와 화면 확인
- 검사 명령은 `npm run check`(타입 검사, oxlint, Vitest, 빌드)다. 소스가 바뀌면 Stop 훅이 자동으로 돌리고, 연속 3번 실패하면 멈춘다. 출력은 마지막 20~50줄만 본다.
- 테스트는 Vitest(`src/**/*.test.ts`)로 쓴다. 화면은 UI가 생긴 단계부터 단계 끝에 Playwright로 확인하고, 즉석 확인은 Claude in Chrome으로 한다.
- 모양은 스크린샷을 `docs/mockup-color/`의 해당 화면과 비교한다.

## 단계 보고서에 더할 항목
Playwright 실행 여부, 실기기 확인 상태(NOT PERFORMED 또는 VERIFIED).

## 실기기 확인(사용자에게 부탁하는 시점)
일정 입력·수정·삭제를 만든 뒤, 끌기와 길게 누르기를 만든 뒤, 백업을 만든 뒤, Pages 배포 직후. 확인 항목은 안전 영역, 홈 화면 앱, 길게 누르기·끌기, 공유 시트 백업, 반투명 블러다.

## 설정 위치
권한과 Stop 훅은 `.claude/settings.json`, 훅 스크립트는 `.claude/hooks/`에 있다. 가드 훅과 서브에이전트(`test-designer`, `step-evaluator`)는 전역에 있다.
