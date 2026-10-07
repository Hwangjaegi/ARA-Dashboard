import {
  CloudUpload,
  Download,
  Settings2,
  Sparkles,
} from 'lucide-react';

export default function AppsPage({ showToast, alternate = false }) {
  return (
    <div className={`content-wrap subpage${alternate ? '' : ' apps-page'}`}>
      {alternate && (
        <>
          <div className="eyebrow">
            ARA WORKSPACE <span className="eyebrow-dot" /> RESOURCES
          </div>
          <h1>업무 자료실</h1>
          <p className="subpage-lede">팀 업무에 필요한 서식과 자료를 한 곳에서 확인하세요.</p>
        </>
      )}
      {alternate ? (
        <div className="panel resource-empty">
          <div className="empty-icon">
            <CloudUpload size={25} />
          </div>
          <h2>자료를 준비하고 있어요</h2>
          <p>FileMaker에 저장된 공용 서식과 업무 자료가 이곳에 표시됩니다.</p>
          <button
            className="button-primary"
            onClick={() => showToast('FileMaker 자료실 연동이 필요합니다.')}
          >
            <Download size={15} /> 자료실 새로고침
          </button>
        </div>
      ) : (
        <iframe
          className="filemaker-webdirect-frame"
          src="https://fms.aralogistic.com/fmi/webd/ARAERP.fmp12"
          title="ARA ERP FileMaker WebDirect"
          allow="clipboard-read; clipboard-write; fullscreen"
          allowFullScreen
        />
      )}
      {alternate && <div className="panel apps-info">
        <div className="info-spark">
          <Sparkles size={18} />
        </div>
        <div>
          <strong>나만의 업무 환경을 만들어 보세요</strong>
          <p>필요한 도구와 서식을 빠르게 찾을 수 있도록 정리하고 있어요.</p>
        </div>
        <button onClick={() => showToast('환경 설정은 준비 중이에요.')}>
          <Settings2 size={16} />
        </button>
      </div>}
    </div>
  );
}
