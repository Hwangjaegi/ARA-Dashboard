import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileUp,
  ImagePlus,
  ListChecks,
  LockKeyhole,
  Users,
} from 'lucide-react';

const guideSections = [
  {
    icon: ListChecks,
    title: '오늘의 업무 작성하기',
    steps: [
      '대시보드의 ‘오늘의 업무’ 입력란에 오늘 처리할 일을 적고 추가합니다.',
      '업무를 모두 작성한 뒤 ‘오늘 업무 확정하기’를 누릅니다. 확정 전에는 내용을 수정하거나 삭제할 수 있습니다.',
      '업무를 마치면 각 항목의 체크박스를 눌러 완료로 표시합니다. 완료 수와 진행률은 대시보드에서 확인할 수 있습니다.',
    ],
    note: '업무를 확정하면 당일 업무 내용은 잠기며, 완료 여부는 계속 변경할 수 있습니다.',
  },
  {
    icon: CalendarDays,
    title: '지난 업무 확인하기',
    steps: [
      '오늘의 업무 제목 옆 달력 버튼을 눌러 확인할 날짜를 선택합니다.',
      '선택한 날짜의 업무와 완료 상태를 확인할 수 있습니다. 지난 날짜의 업무는 조회 전용입니다.',
    ],
  },
  {
    icon: FileUp,
    title: '내 업무 서식 관리하기',
    steps: [
      '‘내 업무 서식’에서 서식 추가를 눌러 Word 또는 Excel 파일을 업로드합니다.',
      'Word는 .doc, .docx, Excel은 .xls, .xlsx, .xlsm 파일을 지원합니다. 여러 서식을 등록할 수 있습니다.',
      '각 서식 오른쪽 버튼에서 다운로드, 파일 교체, 삭제를 할 수 있습니다. 등록한 서식은 내 계정에 저장됩니다.',
    ],
  },
  {
    icon: ImagePlus,
    title: '대시보드 배경 바꾸기',
    steps: [
      '대시보드 위쪽의 ‘배경 꾸미기’를 누르고 내 컴퓨터에서 이미지를 선택합니다.',
      '선택한 배경은 FileMaker에 저장되어 다음 로그인에도 표시됩니다.',
    ],
  },
  {
    icon: Users,
    title: '팀원과 팀 업무 확인하기',
    steps: [
      '대시보드 아래쪽의 ‘팀원 내역’에서 같은 팀 동료를 확인할 수 있습니다.',
      '팀원 업무 조회 권한이 있는 사용자는 ‘팀 현황 보기’ 또는 사이드바의 ‘팀 업무 현황’을 눌러 팀원별 업무와 선택한 날짜의 기록을 확인합니다.',
    ],
    adminOnly: true,
  },
];

export default function GuidePage({ isAdmin, onBack }) {
  const sections = guideSections.filter((section) => !section.adminOnly || isAdmin);

  return (
    <div className="content-wrap guide-wrap">
      <div className="guide-heading">
        <div>
          <div className="eyebrow">ARA WORKSPACE · USER GUIDE</div>
          <h1>ARA Dashboard 사용 안내</h1>
          <p>업무를 기록하고, 서식과 팀 현황을 확인하는 방법을 안내합니다.</p>
        </div>
        <button className="button-light guide-back" onClick={onBack}>
          <ArrowLeft size={16} /> 대시보드로 돌아가기
        </button>
      </div>

      <div className="guide-callout">
        <LockKeyhole size={20} />
        <div>
          <strong>매일 업무는 확정 전에 작성해 주세요.</strong>
          <p>업무를 확정한 뒤에는 내용을 고칠 수 없고, 완료 체크만 할 수 있습니다.</p>
        </div>
      </div>

      <div className="guide-grid">
        {sections.map(({ icon: Icon, title, steps, note }, index) => (
          <section className="guide-card" key={title}>
            <div className="guide-card-title">
              <span className="guide-icon"><Icon size={19} /></span>
              <div>
                <small>GUIDE {String(index + 1).padStart(2, '0')}</small>
                <h2>{title}</h2>
              </div>
            </div>
            <ol>
              {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            {note && (
              <div className="guide-note">
                <CheckCircle2 size={16} /> {note}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
