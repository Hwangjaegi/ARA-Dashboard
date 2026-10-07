import { ArrowRight, Check, LockKeyhole, Sparkles, Users } from 'lucide-react';

export default function LoginPage({ onSubmit, error, busy }) {
  return (
    <div className="login-screen">
      <div className="login-decoration decor-one" />
      <div className="login-decoration decor-two" />
      <div className="login-left">
        <div className="login-brand">
          <img src={`${import.meta.env.BASE_URL}assets/ARA_Logo.png`} alt="ARA" />
          <span>WORKSPACE</span>
        </div>
        <div className="login-message">
          <div className="eyebrow">
            <Sparkles size={14} /> YOUR WORK, IN ONE PLACE
          </div>
          <h1>
            오늘의 업무를
            <br />
            <em>더 선명하게.</em>
          </h1>
          <p>
            하루의 시작부터 마무리까지,
            <br />
            ARA Workspace와 함께하세요.
          </p>
          <div className="login-note">
            <div className="note-check">
              <Check size={15} />
            </div>
            <span>
              오늘의 우선순위를 정하고
              <br />
              팀과 함께 목표를 완성해요.
            </span>
          </div>
        </div>
        <div className="login-footer">© 2026 ARA Logistic · ARA Workspace</div>
      </div>
      <div className="login-right">
        <form className="login-card" onSubmit={onSubmit}>
          <div className="login-card-icon">
            <LockKeyhole size={20} />
          </div>
          <div className="eyebrow login-eyebrow">WELCOME BACK</div>
          <h2>로그인</h2>
          <p className="login-subtitle">계정 정보를 입력해 대시보드에 접속하세요.</p>
          <label className="field-label" htmlFor="username">
            아이디
          </label>
          <div className="input-wrap">
            <Users size={17} />
            <input
              id="username"
              name="username"
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              required
            />
          </div>
          <div className="password-label">
            <label className="field-label" htmlFor="password">
              비밀번호
            </label>
            <button type="button" onClick={() => window.alert('계정 담당자에게 문의해 주세요.')}>
              비밀번호를 잊으셨나요?
            </button>
          </div>
          <div className="input-wrap">
            <LockKeyhole size={17} />
            <input
              id="password"
              name="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="login-button" disabled={busy}>
            {busy ? '확인 중…' : '로그인'} <ArrowRight size={17} />
          </button>
          <div className="login-secure">
            <LockKeyhole size={13} /> 안전한 사내 계정으로 로그인합니다
          </div>
        </form>
        <div className="login-help">
          접속에 문제가 있나요? <a href="mailto:help@aralogistic.com">담당자에게 문의하기</a>
        </div>
      </div>
    </div>
  );
}
