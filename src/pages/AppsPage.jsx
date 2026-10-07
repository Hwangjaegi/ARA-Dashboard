import { useEffect } from 'react';

const WEBDIRECT_URL = 'https://fms.aralogistic.com/fmi/webd/ARAERP.fmp12';

export default function AppsPage({ employeeId, scriptName }) {
  const url = new URL(WEBDIRECT_URL);
  if (employeeId) {
    url.searchParams.set('script', scriptName);
    url.searchParams.set('param', String(employeeId));
  }

  useEffect(() => {
    const scriptParameter = url.searchParams.get('param');
    console.info('[ARA WebDirect] 스크립트 호출 정보', {
      script: url.searchParams.get('script') || '(미설정)',
      employeeId: employeeId || '(비어 있음)',
      scriptParameter: scriptParameter || '(비어 있음)',
      iframeUrl: url.href,
    });
    if (!employeeId) {
      console.warn('[ARA WebDirect] user.employeeId가 없어 스크립트 매개변수를 전달하지 못했습니다.');
    }
  }, [employeeId, scriptName, url.href]);

  return (
    <div className="content-wrap subpage apps-page">
      <iframe
        className="filemaker-webdirect-frame"
        src={url.href}
        title="ARA FileMaker WebDirect"
        allow="clipboard-read; clipboard-write; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
