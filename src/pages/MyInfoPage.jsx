export default function MyInfoPage({ user }) {
  const profile = user.profile || {};
  const rows = [
    ['이름', profile.name || user.name || user.username],
    ['입사일', profile.joinDate],
    ['입사연차', profile.tenure],
    ['재직구분', profile.employmentStatus],
    ['국적', profile.nationality],
    ['직책', profile.jobTitle],
    ['책임 구분', profile.responsibility],
  ];
  return (
    <div className="content-wrap subpage my-info-page">
      <div className="eyebrow">
        MY ACCOUNT <span className="eyebrow-dot" /> PROFILE
      </div>
      <h1>나의 정보</h1>
      <p className="subpage-lede">FileMaker에 등록된 내 직원 정보를 확인합니다.</p>
      <section className="panel my-info-card">
        <div className="my-info-heading">
          <div className="avatar avatar-violet my-info-avatar">
            {(profile.name || user.name || user.username || 'A').slice(0, 1)}
          </div>
          <div>
            <div className="section-eyebrow">ARA EMPLOYEE</div>
            <h2>{profile.name || user.name || user.username}</h2>
            <span>
              {profile.jobTitle || '직책 미등록'} · {profile.responsibility || '팀원'}
            </span>
            {profile.englishName && <small>{profile.englishName}</small>}
          </div>
        </div>
        <div className="my-info-grid">
          {rows.map(([label, value]) => (
            <div className="my-info-field" key={label}>
              <span>{label}</span>
              <strong>
                {value === undefined || value === null || value === '' ? '—' : String(value)}
              </strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
