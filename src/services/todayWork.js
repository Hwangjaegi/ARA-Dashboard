import { FM_API, FM_DB, sessionHeaders } from './filemaker';

const FM_LAYOUT = 'TodayWork_Employee';

async function readResponse(response) {
  return response.json().catch(() => ({}));
}

function assertSuccess(response, payload, fallback) {
  if (response.ok) return;
  const message = payload.messages?.[0]?.message;
  throw new Error(message || fallback);
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// This FileMaker date field validates the Data API find value in the file's US date format.
function fileMakerDate(date) {
  const [year, month, day] = date.split('-');
  return `${month}/${day}/${year}`;
}

async function withSession(callback) {
  let token;
  try {
    const response = await fetch(`${FM_API}/databases/${FM_DB}/sessions`, {
      method: 'POST',
      headers: sessionHeaders(),
      body: '{}',
    });
    const payload = await readResponse(response);
    token = payload.response?.token || response.headers.get('x-fm-data-access-token');
    assertSuccess(response, payload, 'FileMaker 세션을 만들지 못했습니다.');
    if (!token) throw new Error('FileMaker 세션 토큰이 응답에 없습니다.');
    return await callback(token);
  } catch (error) {
    if (error instanceof TypeError)
      throw new Error(
        'FileMaker에 연결하지 못했습니다. Data API와 Vite 프록시 설정을 확인해 주세요.',
      );
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

function apiUrl(path) {
  return `${FM_API}/databases/${FM_DB}/layouts/${encodeURIComponent(FM_LAYOUT)}${path}`;
}

function headers(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function toTask(record) {
  const fields = record.fieldData || {};
  return {
    id: String(record.recordId),
    employeeId: String(fields._EmployeeID || ''),
    text: String(fields.WorkPlan || ''),
    done: String(fields.WorkCompleted) === '1',
    workDate: fields.WorkDate || '',
    submitted: String(fields.WorkPlanSubmitted) === '1',
  };
}

export { localDateString };

export async function listTodayWork(employeeId, workDate = localDateString()) {
  if (!employeeId)
    throw new Error(
      '로그인 사용자에게 FileMaker __ID가 없습니다. T_Employee 레이아웃 필드를 확인해 주세요.',
    );
  return withSession(async (token) => {
    const response = await fetch(apiUrl('/_find'), {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        query: [{ _EmployeeID: `==${employeeId}`, WorkDate: `==${fileMakerDate(workDate)}` }],
        limit: '100',
        dateformats: 0,
      }),
    });
    const payload = await readResponse(response);
    const code = String(payload.messages?.[0]?.code || '');
    if (!response.ok && code !== '401')
      assertSuccess(response, payload, '오늘의 업무를 조회하지 못했습니다.');
    if (code === '401') return [];
    return (payload.response?.data || []).map(toTask);
  });
}

export async function listTeamTodayWork(employeeIds, workDate = localDateString()) {
  const uniqueIds = [...new Set(employeeIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!uniqueIds.length) return {};

  return withSession(async (token) => {
    const response = await fetch(apiUrl('/_find'), {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        query: uniqueIds.map((employeeId) => ({
          _EmployeeID: `==${employeeId}`,
          WorkDate: `==${fileMakerDate(workDate)}`,
        })),
        limit: '1000',
        dateformats: 0,
      }),
    });
    const payload = await readResponse(response);
    const code = String(payload.messages?.[0]?.code || '');
    if (!response.ok && code !== '401')
      assertSuccess(response, payload, '팀 업무를 조회하지 못했습니다.');
    const grouped = Object.fromEntries(uniqueIds.map((employeeId) => [employeeId, []]));
    if (code === '401') return grouped;
    for (const record of payload.response?.data || []) {
      const task = toTask(record);
      if (grouped[task.employeeId]) grouped[task.employeeId].push(task);
    }
    return grouped;
  });
}

export async function createTodayWork(employeeId, workPlan, workDate = localDateString()) {
  if (!employeeId) throw new Error('로그인 사용자에게 FileMaker __ID가 없습니다.');
  return withSession(async (token) => {
    const response = await fetch(apiUrl('/records'), {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        fieldData: {
          _EmployeeID: employeeId,
          WorkPlan: workPlan,
          WorkCompleted: 0,
          WorkDate: fileMakerDate(workDate),
          WorkPlanSubmitted: 0,
        },
        dateformats: 0,
      }),
    });
    const payload = await readResponse(response);
    assertSuccess(response, payload, '업무를 저장하지 못했습니다.');
    const recordId = payload.response?.recordId;
    if (!recordId) throw new Error('업무는 저장됐지만 FileMaker에서 레코드 ID를 받지 못했습니다.');
    return { id: String(recordId), text: workPlan, done: false, workDate, submitted: false };
  });
}

export async function updateTodayWork(recordId, fieldData) {
  return withSession(async (token) => {
    const response = await fetch(apiUrl(`/records/${encodeURIComponent(recordId)}`), {
      method: 'PATCH',
      headers: headers(token),
      body: JSON.stringify({ fieldData }),
    });
    const payload = await readResponse(response);
    assertSuccess(response, payload, '업무를 수정하지 못했습니다.');
  });
}

export async function deleteTodayWork(recordId) {
  return withSession(async (token) => {
    const response = await fetch(apiUrl(`/records/${encodeURIComponent(recordId)}`), {
      method: 'DELETE',
      headers: headers(token),
    });
    const payload = await readResponse(response);
    assertSuccess(response, payload, '업무를 삭제하지 못했습니다.');
  });
}
