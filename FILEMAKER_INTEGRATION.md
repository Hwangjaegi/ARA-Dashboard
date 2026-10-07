# FileMaker 연동 방식

React의 `src/services/auth.js`가 세션 생성, `T_Employee` 조회, 세션 종료 요청을 직접 구성합니다. FileMaker Data API는 CORS와 `OPTIONS`를 지원하지 않으므로 브라우저가 FileMaker 도메인을 직접 호출할 수 없습니다. 개발 중에는 Vite의 `/fm-api` 프록시가 같은 출처 요청을 `https://fms.aralogistic.com`으로 전달합니다.

DataAPI 계정은 `.env.local`에 둡니다. 변수명에 `VITE_`를 붙이지 않아 React 빌드에 포함되지 않고, Vite 프록시가 세션 생성 요청에 Basic Authorization 헤더를 추가합니다. FileMaker 세션 토큰과 직원의 로그인 입력값은 브라우저에서 Data API 요청에 사용됩니다.

## 로그인 요청 흐름

1. Vite 프록시를 통해 Data API `/sessions`에 세션 생성 요청.
2. 반환된 토큰으로 `T_Employee/_find`를 요청해 `Login ID`, `Login PW` exact match 확인.
3. 로그인 성공 시 사용자 정보만 반환하고, 마지막으로 세션을 종료.

## 남은 확인 사항

- 운영 배포에서는 Vite 개발 프록시 대신 웹 호스트의 같은 출처 reverse proxy 경로를 설정해야 합니다. FileMaker Data API 자체는 CORS를 지원하지 않습니다.
- `T_Employee` 레이아웃의 응답 필드에 `입사일`, `입사연차`, `재직구분`, `국적`, `Name`, `NameEng`, `JobTitleKor`, `팀장선택`, `_TeamID`를 포함해야 합니다. Data API는 `_TeamID`로 두 번째 `_find`를 해 같은 팀 동료를 구합니다. `_TeamID`가 첫 검색 응답에서 빠지면 동료 조회를 할 수 없습니다.
- 팀장 여부는 `팀장선택` 값이 있는지로 판단하고, `JobTitleKor`가 `사장`이면 `총괄책임자`로 표시합니다. 팀장 또는 사장은 관리자용 팀 메뉴도 볼 수 있도록 처리합니다.
- 업무·팀 목록·서식은 아직 프로토타입 데이터/화면입니다. 실제 레이아웃과 필드 정보가 필요합니다.
