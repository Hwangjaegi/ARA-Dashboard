# FileMaker 연동 방식

React의 `src/services/auth.js`가 세션 생성, `T_Employee` 조회, 세션 종료 요청을 직접 구성합니다. 개발 모드에서는 Vite의 `/fm-api` 프록시를 사용하고, 배포 빌드에서는 같은 도메인의 `/fmi/data/vLatest`를 직접 호출합니다. 정적 파일은 `/ARADashboard/` 경로를 기준으로 빌드합니다.

세션 생성 요청에는 DataAPI 계정의 Basic Authorization 헤더를 사용하고, 이후 요청은 반환된 FileMaker 세션 토큰으로 인증합니다.

## 로그인 요청 흐름

1. 개발에서는 Vite 프록시, 배포에서는 같은 도메인의 `/fmi/data`를 통해 `/sessions`에 세션 생성 요청.
2. 반환된 토큰으로 `T_Employee/_find`를 요청해 `Login ID`, `Login PW` exact match 확인.
3. 로그인 성공 시 사용자 정보만 반환하고, 마지막으로 세션을 종료.

## 남은 확인 사항

- `T_Employee` 레이아웃의 응답 필드에 `입사일`, `입사연차`, `재직구분`, `국적`, `Name`, `NameEng`, `JobTitleKor`, `팀장선택`, `_TeamID`를 포함해야 합니다. Data API는 `_TeamID`로 두 번째 `_find`를 해 같은 팀 동료를 구합니다. `_TeamID`가 첫 검색 응답에서 빠지면 동료 조회를 할 수 없습니다.
- 팀장 여부는 `팀장선택` 값이 있는지로 판단하고, `JobTitleKor`가 `사장`이면 `CEO`로 표시합니다. 팀장 또는 사장은 관리자용 팀 메뉴도 볼 수 있도록 처리합니다.
- 대시보드 개인 배경 업로드는 `T_Employee`의 직원 `__ID`를 찾아 `/records/{recordId}/containers/대시보드배경/1` 경로로 multipart `upload`를 보내는 Data API 직접 호출입니다. 조회는 `Get DashBoard Img` 스크립트에 직원 `__ID`를 전달하고, 스크립트가 `Employee::대시보드배경`을 Base64 텍스트 결과로 반환합니다. 스트리밍 URL은 FileMaker 서버의 세션 인증을 요구할 수 있어 브라우저에서 직접 사용하지 않습니다. React는 배경 이미지를 `localStorage`에 저장하지 않으며, 기존 `Import DashBoard Img` 스크립트는 업로드에 사용하지 않습니다.
- 업무·팀 목록·서식은 아직 프로토타입 데이터/화면입니다. 실제 레이아웃과 필드 정보가 필요합니다.
