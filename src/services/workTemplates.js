import { FM_API, FM_DB, sessionHeaders } from './filemaker';

const FM_LAYOUT = 'WorkTemplate_Employee';
const TEMPLATE_NAME_FIELD = 'TemplateName';

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

function jsonHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function fieldDataValue(fieldData = {}, fieldName) {
  return (
    fieldData[fieldName] ??
    fieldData[`WorkTemplate::${fieldName}`] ??
    fieldData[`WorkTemplate_Employee::${fieldName}`] ??
    ''
  );
}

function normalizeRecord(record) {
  const fields = record.fieldData || {};
  const type = String(fieldDataValue(fields, 'Type'));
  const templateName = String(fieldDataValue(fields, TEMPLATE_NAME_FIELD) || '');
  return {
    id: String(record.recordId),
    employeeTemplateId: String(fieldDataValue(fields, '__ID') || ''),
    type,
    name: templateName || `${type || '업무'} 서식`,
  };
}

async function findByEmployee(token, employeeId) {
  const response = await fetch(apiUrl('/_find'), {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ query: [{ _EmployeeID: `==${employeeId}` }], limit: '1000' }),
  });
  const payload = await readResponse(response);
  const code = String(payload.messages?.[0]?.code || '');
  if (!response.ok && code !== '401')
    assertSuccess(response, payload, '업무 서식을 조회하지 못했습니다.');
  if (code === '401') return [];
  return payload.response?.data || [];
}

async function hasTemplateNameField(token) {
  const response = await fetch(apiUrl(''), { headers: { Authorization: `Bearer ${token}` } });
  const payload = await readResponse(response);
  assertSuccess(response, payload, '업무 서식 레이아웃 정보를 확인하지 못했습니다.');
  return (payload.response?.fieldMetaData || []).some(
    (field) => field.name.split('::').at(-1) === TEMPLATE_NAME_FIELD,
  );
}

export async function listWorkTemplates(employeeId) {
  if (!employeeId) throw new Error('로그인 사용자에게 FileMaker __ID가 없습니다.');
  return withSession(async (token) => {
    const records = await findByEmployee(token, employeeId);
    return records
      .map(normalizeRecord)
      .filter((template) => ['Word', 'Excel'].includes(template.type));
  });
}

export async function deleteWorkTemplate(employeeId, template) {
  if (!employeeId) throw new Error('로그인 사용자에게 FileMaker __ID가 없습니다.');
  if (!template.employeeTemplateId) throw new Error('삭제할 서식의 FileMaker __ID 값이 없습니다.');

  return withSession(async (token) => {
    const response = await fetch(apiUrl('/_find'), {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        query: [{ __ID: `==${template.employeeTemplateId}`, _EmployeeID: `==${employeeId}` }],
        limit: '1',
      }),
    });
    const payload = await readResponse(response);
    const code = String(payload.messages?.[0]?.code || '');
    if (!response.ok && code !== '401')
      assertSuccess(response, payload, '삭제할 서식을 조회하지 못했습니다.');
    const recordId = payload.response?.data?.[0]?.recordId;
    if (!recordId)
      throw new Error('삭제할 서식을 찾지 못했거나 현재 사용자 소유의 서식이 아닙니다.');

    const deleteResponse = await fetch(apiUrl(`/records/${encodeURIComponent(recordId)}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const deletePayload = await readResponse(deleteResponse);
    assertSuccess(deleteResponse, deletePayload, '업무 서식을 삭제하지 못했습니다.');
  });
}

export async function saveWorkTemplate(employeeId, file, type, replaceTemplate = null) {
  if (!employeeId) throw new Error('로그인 사용자에게 FileMaker __ID가 없습니다.');
  if (!['Word', 'Excel'].includes(type))
    throw new Error('Word 또는 Excel 서식만 업로드할 수 있습니다.');
  if (replaceTemplate && replaceTemplate.type !== type) {
    throw new Error(`기존 ${replaceTemplate.type} 서식은 같은 종류의 파일로만 교체할 수 있습니다.`);
  }

  return withSession(async (token) => {
    const hasNameField = await hasTemplateNameField(token);
    let recordId = replaceTemplate?.id;
    if (replaceTemplate) {
      const records = await findByEmployee(token, employeeId);
      const ownedRecord = records.find((record) => String(record.recordId) === String(recordId));
      if (!ownedRecord)
        throw new Error('교체할 서식을 찾지 못했거나 현재 사용자 소유의 서식이 아닙니다.');
    } else {
      const fieldData = { _EmployeeID: employeeId, Type: type };
      if (hasNameField) fieldData[TEMPLATE_NAME_FIELD] = file.name;
      const createResponse = await fetch(apiUrl('/records'), {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({ fieldData }),
      });
      const createPayload = await readResponse(createResponse);
      assertSuccess(createResponse, createPayload, '업무 서식 레코드를 만들지 못했습니다.');
      recordId = createPayload.response?.recordId;
      if (!recordId)
        throw new Error('서식 레코드는 만들었지만 FileMaker에서 레코드 ID를 받지 못했습니다.');
    }

    try {
      const form = new FormData();
      form.append('upload', file, file.name);
      const uploadResponse = await fetch(
        apiUrl(`/records/${encodeURIComponent(recordId)}/containers/Template/1`),
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      );
      const uploadPayload = await readResponse(uploadResponse);
      assertSuccess(
        uploadResponse,
        uploadPayload,
        '파일을 FileMaker 컨테이너에 업로드하지 못했습니다.',
      );
      if (replaceTemplate && hasNameField) {
        const updateResponse = await fetch(apiUrl(`/records/${encodeURIComponent(recordId)}`), {
          method: 'PATCH',
          headers: jsonHeaders(token),
          body: JSON.stringify({ fieldData: { [TEMPLATE_NAME_FIELD]: file.name } }),
        });
        const updatePayload = await readResponse(updateResponse);
        assertSuccess(updateResponse, updatePayload, '교체한 서식의 파일명을 저장하지 못했습니다.');
      }
    } catch (error) {
      if (!replaceTemplate) {
        await fetch(apiUrl(`/records/${encodeURIComponent(recordId)}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      throw error;
    }

    const savedResponse = await fetch(apiUrl(`/records/${encodeURIComponent(recordId)}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const savedPayload = await readResponse(savedResponse);
    assertSuccess(savedResponse, savedPayload, '저장된 서식의 고유 ID를 확인하지 못했습니다.');
    const savedRecord = savedPayload.response?.data?.[0];

    return {
      id: String(recordId),
      employeeTemplateId: String(fieldDataValue(savedRecord?.fieldData, '__ID') || ''),
      type,
      name: file.name,
    };
  });
}

function base64ToBlob(value, type) {
  const binary = atob(value.replace(/\s/g, ''));
  const chunks = [];
  const chunkSize = 32 * 1024;
  for (let offset = 0; offset < binary.length; offset += chunkSize) {
    const chunk = binary.slice(offset, offset + chunkSize);
    const bytes = new Uint8Array(chunk.length);
    for (let index = 0; index < chunk.length; index += 1) bytes[index] = chunk.charCodeAt(index);
    chunks.push(bytes);
  }
  return new Blob(chunks, { type });
}

function mimeTypeForTemplate(name, type) {
  const extension = name.split('.').pop()?.toLowerCase();
  return (
    {
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    }[extension] || (type === 'Word' ? 'application/msword' : 'application/vnd.ms-excel')
  );
}

export async function downloadWorkTemplate(template, employeeId) {
  if (!template.employeeTemplateId)
    throw new Error('서식의 FileMaker __ID 값이 없습니다. 서식을 다시 불러오거나 업로드해 주세요.');
  if (!employeeId) throw new Error('로그인 사용자에게 FileMaker __ID가 없습니다.');

  return withSession(async (token) => {
    const scriptUrl = new URL(
      apiUrl(`/script/${encodeURIComponent('Export Template')}`),
      window.location.origin,
    );
    // FileMaker script uses JSONGetElement(parameter; 1) and ; 2), so send
    // those exact numeric keys as an object.
    scriptUrl.searchParams.set(
      'script.param',
      JSON.stringify({
        1: template.employeeTemplateId,
        2: employeeId,
      }),
    );
    const response = await fetch(scriptUrl, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await readResponse(response);
    assertSuccess(response, payload, 'FileMaker 서식 내보내기 스크립트를 실행하지 못했습니다.');
    const scriptError = String(payload.response?.scriptError ?? '0');
    if (scriptError !== '0')
      throw new Error(`FileMaker 스크립트에서 오류가 발생했습니다. (scriptError: ${scriptError})`);
    const base64 = payload.response?.scriptResult;
    if (typeof base64 !== 'string' || !base64.trim()) {
      throw new Error(
        '스크립트 결과가 비어 있습니다. Export Template 스크립트의 마지막 단계가 텍스트 결과를 반환하는지 확인해 주세요.',
      );
    }

    let blob;
    try {
      blob = base64ToBlob(base64, mimeTypeForTemplate(template.name, template.type));
    } catch {
      throw new Error(
        'FileMaker 스크립트 결과를 Base64 파일로 변환하지 못했습니다. Base64Encode 결과를 반환하는지 확인해 주세요.',
      );
    }
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = template.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  });
}
