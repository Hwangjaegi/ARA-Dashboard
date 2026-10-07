import { FM_API, FM_DB, sessionHeaders } from './filemaker';

const FM_LAYOUT = 'T_Employee';
const CONTAINER_FIELD = '대시보드배경';
const GET_BACKGROUND_SCRIPT = '배경화면 이미지 가져오기';

async function readResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { rawMessage: text };
  }
}

function assertSuccess(response, payload, fallback) {
  const code = String(payload.messages?.[0]?.code ?? '0');
  if (response.ok && code === '0') return;
  throw new Error(payload.messages?.[0]?.message || payload.rawMessage || fallback);
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
    if (error instanceof TypeError) {
      throw new Error(
        'FileMaker에 연결하지 못했습니다. Data API와 Vite 프록시 설정을 확인해 주세요.',
      );
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

function apiUrl(path) {
  return `${FM_API}/databases/${FM_DB}/layouts/${encodeURIComponent(FM_LAYOUT)}${path}`;
}

function headers(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function escapeFindValue(value) {
  return String(value).replace(/[\\?*#@=<>!~]/g, '\\$&');
}

async function findEmployeeRecord(token, employeeId) {
  const response = await fetch(apiUrl('/_find'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      query: [{ __ID: `==${escapeFindValue(employeeId)}` }],
      limit: '1',
    }),
  });
  const payload = await readResponse(response);
  const code = String(payload.messages?.[0]?.code || '');
  if (!response.ok && code !== '401') {
    assertSuccess(response, payload, '직원 배경 레코드를 조회하지 못했습니다.');
  }
  const record = payload.response?.data?.[0];
  if (!record) throw new Error('로그인한 직원의 FileMaker 레코드를 찾지 못했습니다.');
  return record;
}

export async function saveDashboardBackground(employeeId, file) {
  if (!employeeId) throw new Error('로그인 사용자에게 FileMaker __ID가 없습니다.');
  if (!(file instanceof Blob)) throw new Error('업로드할 배경 이미지 파일을 확인해 주세요.');

  return withSession(async (token) => {
    const record = await findEmployeeRecord(token, employeeId);
    const form = new FormData();
    form.append('upload', file, file.name || 'dashboard-background');
    const response = await fetch(
      apiUrl(
        `/records/${encodeURIComponent(record.recordId)}/containers/${encodeURIComponent(CONTAINER_FIELD)}/1`,
      ),
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
    );
    const payload = await readResponse(response);
    assertSuccess(response, payload, '대시보드 배경을 FileMaker 컨테이너에 저장하지 못했습니다.');
  });
}

function imageMimeType(base64) {
  const header = atob(base64.slice(0, 40));
  if (header.startsWith('\x89PNG\r\n\x1a\n')) return 'image/png';
  if (header.startsWith('\xff\xd8\xff')) return 'image/jpeg';
  if (header.startsWith('GIF87a') || header.startsWith('GIF89a')) return 'image/gif';
  if (header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP') return 'image/webp';
  if (header.startsWith('BM')) return 'image/bmp';
  return 'image/png';
}

export async function getDashboardBackground(employeeId) {
  if (!employeeId) throw new Error('로그인 사용자에게 FileMaker __ID가 없습니다.');

  return withSession(async (token) => {
    const scriptUrl = new URL(
      apiUrl(`/script/${encodeURIComponent(GET_BACKGROUND_SCRIPT)}`),
      window.location.origin,
    );
    scriptUrl.searchParams.set('script.param', JSON.stringify({ 1: String(employeeId) }));
    const response = await fetch(scriptUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await readResponse(response);
    assertSuccess(response, payload, '대시보드 배경 조회 스크립트를 실행하지 못했습니다.');
    const scriptError = String(payload.response?.scriptError ?? '0');
    if (scriptError !== '0') {
      throw new Error(`대시보드 배경 조회 스크립트 오류입니다. (scriptError: ${scriptError})`);
    }

    const rawBase64 = String(payload.response?.scriptResult || '').trim();
    const base64 = rawBase64.replace(/^data:[^,]*;base64,/i, '').replace(/\s/g, '');
    if (!base64) return '';
    return `data:${imageMimeType(base64)};base64,${base64}`;
  });
}
