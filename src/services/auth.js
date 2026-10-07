const FM_DB = 'ARAERP';
const FM_LAYOUT = 'T_Employee';
const FM_API = '/fm-api/fmi/data/vLatest';

function escapeFindValue(value) {
  return value.replace(/[\\?*#@=<>!~]/g, '\\$&');
}

async function readResponse(response) {
  return response.json().catch(() => ({}));
}

// FileMaker Data API를 사용하여 로그인 처리
// 사용할 필드 : 입사일 , 입사연차 , 재직구분 , 국적 , Name , NameEng , JobTitleKor , JobTitle_Eng , 팀장선택 , _TeamID
export async function login(username, password) {
  let token;
  try {
    const sessionResponse = await fetch(`${FM_API}/databases/${FM_DB}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const sessionData = await readResponse(sessionResponse);
    token = sessionData.response?.token || sessionResponse.headers.get('x-fm-data-access-token');
    if (!sessionResponse.ok || !token) {
      throw new Error(sessionData.messages?.[0]?.message || 'FileMaker 세션을 만들지 못했습니다.');
    }

    const findResponse = await fetch(`${FM_API}/databases/${FM_DB}/layouts/${encodeURIComponent(FM_LAYOUT)}/_find`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        query: [{ 'Login ID': `==${escapeFindValue(username)}`, 'Login PW': `==${escapeFindValue(password)}` }],
        limit: '1',
      }),
    });
    const findData = await readResponse(findResponse);
    console.log('Find Data:', findData); // 디버깅용 로그
    const record = findData.response?.data?.[0];

    const findCode = String(findData.messages?.[0]?.code || '');
    if (!findResponse.ok && findCode !== '401') {
      throw new Error(findData.messages?.[0]?.message || '직원 정보를 조회하지 못했습니다.');
    }
    if (findCode === '401' || !record) throw new Error('아이디 또는 비밀번호를 확인해 주세요.');

    const fieldData = record.fieldData || {};
    console.log('Field Data:', fieldData); // 디버깅용 로그
    const teamId = String(fieldData._TeamID || '').trim();
    const jobTitle = String(fieldData.JobTitleKor || '').trim();
    const teamLeadSelection = String(fieldData['팀장선택'] || '').trim();
    const displayName = fieldData.Name || fieldData['Login ID'] || username;
    let teamMembers = [];
    let teamLookupMessage = '';

    if (teamId) {
      try {
        const teamResponse = await fetch(`${FM_API}/databases/${FM_DB}/layouts/${encodeURIComponent(FM_LAYOUT)}/_find`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ query: [{ _TeamID: `==${escapeFindValue(teamId)}` }], limit: '100' }),
        });
        const teamData = await readResponse(teamResponse);
        console.log('Team Data:', teamData); // 디버깅용 로그
        const teamCode = String(teamData.messages?.[0]?.code || '');
        if (!teamResponse.ok && teamCode !== '401') {
          teamLookupMessage = '팀원 조회에 실패했습니다. T_Employee 레이아웃의 _TeamID 필드를 확인해 주세요.';
        } else {
          teamMembers = (teamData.response?.data || [])
            .filter(member => String(member.recordId) !== String(record.recordId))
            .map(member => ({
              id: member.recordId,
              employeeId: member.fieldData?.__ID || '',
              name: member.fieldData?.Name || member.fieldData?.NameEng || '이름 미등록',
              englishName: member.fieldData?.NameEng || '',
              jobTitle: member.fieldData?.JobTitleKor || '',
              teamLeadSelection: member.fieldData?.['팀장선택'] || '',
            }));
        }
      } catch {
        teamLookupMessage = '팀원 조회 중 연결 오류가 발생했습니다. 잠시 후 다시 로그인해 주세요.';
      }
    } else {
      teamLookupMessage = 'T_Employee 레이아웃 응답에 _TeamID 필드가 없습니다.';
    }

    const isPresident = jobTitle === '사장';
    const isTeamLead = Boolean(teamLeadSelection);
    return {
      user: {
        id: record.recordId,
        employeeId: fieldData.__ID || '',
        username: fieldData['Login ID'] || username,
        name: displayName,
        role: isPresident || isTeamLead ? 'admin' : 'member',
        teamMembers,
        teamLookupMessage,
        profile: {
          joinDate: fieldData['입사일'] || '',
          tenure: fieldData['입사연차'] || '',
          employmentStatus: fieldData['재직구분'] || '',
          nationality: fieldData['국적'] || '',
          name: displayName,
          englishName: fieldData.NameEng || '',
          jobTitle,
          teamLeadSelection,
          responsibility: isPresident ? '총괄책임자' : isTeamLead ? '팀장' : '팀원',
        },
      },
    };
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('FileMaker에 연결하지 못했습니다. Data API와 Vite 프록시 설정을 확인해 주세요.');
    }
    throw error;
  } finally {
    if (token) {
      await fetch(`${FM_API}/databases/${FM_DB}/sessions/${encodeURIComponent(token)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }
}
