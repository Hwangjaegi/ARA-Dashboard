import { useEffect, useMemo, useRef, useState } from 'react';
import { login } from './services/auth';
import { createTodayWork, deleteTodayWork, listTeamTodayWork, listTodayWork, localDateString, updateTodayWork } from './services/todayWork';
import { deleteWorkTemplate, downloadWorkTemplate, listWorkTemplates, saveWorkTemplate } from './services/workTemplates';
import {
  ArrowDownToLine, ArrowRight, Bell, BriefcaseBusiness, Check, CheckCheck, ChevronDown,
  CircleHelp, ClipboardList, CloudUpload, Download, FileSpreadsheet, FileText, ImagePlus,
  LayoutDashboard, LockKeyhole, LogOut, Mail, Menu, MoreHorizontal, Pencil, Plus, Search, Trash2, UserRound,
  Settings2, Sparkles, Users, X,
} from 'lucide-react';

const tools = [
  { name: 'Word', detail: '문서 작성', tone: 'blue', icon: FileText },
  { name: 'Order', detail: '주문 관리', tone: 'orange', icon: ClipboardList },
  { name: 'Excel', detail: '스프레드시트', tone: 'green', icon: FileSpreadsheet },
  { name: 'Outlook', detail: '메일 확인', tone: 'sky', icon: Mail },
  { name: 'Chrome', detail: '브라우저 열기', tone: 'multi', icon: Search },
];

function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('ara-user')); } catch { return null; } });
  const [page, setPage] = useState('MY DASHBOARD');
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState('');
  const [newTask, setNewTask] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [taskBusy, setTaskBusy] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesBusy, setTemplatesBusy] = useState(false);
  const [templatesError, setTemplatesError] = useState('');
  const [templateToReplace, setTemplateToReplace] = useState(null);
  const [background, setBackground] = useState(() => localStorage.getItem('ara-background') || '');
  const [loginError, setLoginError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const fileRef = useRef(null);
  const templateFileRef = useRef(null);
  const isAdmin = user?.role === 'admin';
  const doneCount = tasks.filter(t => t.done).length;
  const percent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const dateLabel = useMemo(() => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date()), []);

  useEffect(() => {
    if (!user?.employeeId) return;
    let active = true;
    setTasksLoading(true);
    setTasksError('');
    listTodayWork(user.employeeId, localDateString())
      .then(records => { if (active) { setTasks(records); setSubmitted(records.length > 0 && records.every(task => task.submitted)); } })
      .catch(error => { if (active) setTasksError(error.message); })
      .finally(() => { if (active) setTasksLoading(false); });
    return () => { active = false; };
  }, [user?.employeeId]);

  useEffect(() => {
    if (!user?.employeeId) return;
    let active = true;
    setTemplatesLoading(true);
    setTemplatesError('');
    listWorkTemplates(user.employeeId)
      .then(items => { if (active) setTemplates(items); })
      .catch(error => { if (active) setTemplatesError(error.message); })
      .finally(() => { if (active) setTemplatesLoading(false); });
    return () => { active = false; };
  }, [user?.employeeId]);

  async function handleLogin(event) {
    event.preventDefault(); setLoginError(''); setBusy(true);
    try {
      const result = await login(event.currentTarget.username.value.trim(), event.currentTarget.password.value);
      setUser(result.user); localStorage.setItem('ara-user', JSON.stringify(result.user));
    } catch (error) {
      setLoginError(error.message === 'Failed to fetch' ? '인증 서버에 연결할 수 없습니다. 서버 설정을 확인해 주세요.' : error.message);
    } finally { setBusy(false); }
  }
  function logout() { setUser(null); localStorage.removeItem('ara-user'); }
  function toggleProfileMenu(anchor) { setProfileMenuAnchor(current => current === anchor ? null : anchor); }
  function openMyInfo() { setPage('MY INFO'); setProfileMenuAnchor(null); }
  function showToast(message) { setToast(message); window.setTimeout(() => setToast(''), 2600); }
  async function addTask(event) {
    event.preventDefault(); if (!newTask.trim() || taskBusy || submitted) return;
    setTaskBusy(true); setTasksError('');
    try {
      const task = await createTodayWork(user.employeeId, newTask.trim(), localDateString());
      setTasks(current => [...current, task]); setNewTask('');
    } catch (error) { setTasksError(error.message); }
    finally { setTaskBusy(false); }
  }
  async function toggleTask(task) {
    const done = !task.done;
    setTaskBusy(true); setTasksError('');
    try {
      await updateTodayWork(task.id, { WorkCompleted: done ? 1 : 0 });
      setTasks(current => current.map(item => item.id === task.id ? { ...item, done } : item));
    } catch (error) { setTasksError(error.message); }
    finally { setTaskBusy(false); }
  }
  async function editTask(task, text) {
    const trimmed = text.trim();
    if (!trimmed || trimmed === task.text || submitted) return;
    if (submitted) return;
    setTaskBusy(true); setTasksError('');
    try {
      await updateTodayWork(task.id, { WorkPlan: trimmed });
      setTasks(current => current.map(item => item.id === task.id ? { ...item, text: trimmed } : item));
    } catch (error) { setTasksError(error.message); throw error; }
    finally { setTaskBusy(false); }
  }
  async function submitPlan() {
    if (!tasks.length || taskBusy || submitted) return;
    setTaskBusy(true); setTasksError('');
    try {
      await Promise.all(tasks.map(task => updateTodayWork(task.id, { WorkPlanSubmitted: 1 })));
      setTasks(current => current.map(task => ({ ...task, submitted: true })));
      setSubmitted(true);
      showToast('오늘의 업무가 확정되었습니다.');
    } catch (error) { setTasksError(`업무 확정 중 오류가 발생했습니다. ${error.message} 일부 업무만 잠겼을 수 있어 새로고침 후 확인해 주세요.`); }
    finally { setTaskBusy(false); }
  }
  async function removeTask(task) {
    if (submitted) return;
    setTaskBusy(true); setTasksError('');
    try {
      await deleteTodayWork(task.id);
      setTasks(current => current.filter(item => item.id !== task.id));
    } catch (error) { setTasksError(error.message); }
    finally { setTaskBusy(false); }
  }
  function changeBackground(event) {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { const image = String(reader.result); setBackground(image); localStorage.setItem('ara-background', image); };
    reader.readAsDataURL(file);
  }
  async function handleTemplateUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) { setTemplateToReplace(null); return; }
    const replacing = templateToReplace;
    setTemplateToReplace(null);
    const extension = file.name.split('.').pop()?.toLowerCase();
    const type = ['doc', 'docx'].includes(extension) ? 'Word' : ['xls', 'xlsx', 'xlsm'].includes(extension) ? 'Excel' : '';
    if (!type) {
      setTemplatesError('Word(.doc, .docx) 또는 Excel(.xls, .xlsx, .xlsm) 파일만 업로드할 수 있습니다.');
      return;
    }
    if (replacing && type !== replacing.type) {
      setTemplatesError(`${replacing.type} 서식은 같은 종류의 파일로만 교체할 수 있습니다.`);
      return;
    }
    setTemplatesBusy(true); setTemplatesError('');
    try {
      const saved = await saveWorkTemplate(user.employeeId, file, type, replacing);
      setTemplates(current => {
        const next = replacing
          ? current.map(item => item.id === replacing.id ? saved : item)
          : [...current, saved];
        return next.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name, 'ko'));
      });
      showToast(replacing ? `${type} 서식을 교체했습니다.` : `${type} 서식을 저장했습니다.`);
    } catch (error) { setTemplatesError(error.message); }
    finally { setTemplatesBusy(false); }
  }
  async function handleTemplateDownload(template) {
    setTemplatesError('');
    try { await downloadWorkTemplate(template, user.employeeId); }
    catch (error) { setTemplatesError(error.message); }
  }
  async function handleTemplateDelete(template) {
    if (!window.confirm(`“${template.name}” 서식을 삭제할까요?`)) return;
    setTemplatesBusy(true);
    setTemplatesError('');
    try {
      await deleteWorkTemplate(user.employeeId, template);
      setTemplates(current => current.filter(item => item.id !== template.id));
      showToast('서식을 삭제했습니다.');
    } catch (error) { setTemplatesError(error.message); }
    finally { setTemplatesBusy(false); }
  }
  function handleTemplateReplace(template) {
    setTemplatesError('');
    setTemplateToReplace(template);
    templateFileRef.current?.click();
  }

  if (!user) return <LoginPage onSubmit={handleLogin} error={loginError} busy={busy} />;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img src="/assets/ARA_Logo.png" alt="ARA" /><span className="brand-rule" /><span className="brand-caption">WORKSPACE</span></div>
      <div className="workspace-label">WORKSPACE <ChevronDown size={14} /></div>
      <nav className="main-nav">
        <p className="nav-caption">MENU</p>
        <NavItem active={page === 'MY DASHBOARD'} icon={LayoutDashboard} onClick={() => setPage('MY DASHBOARD')}>MY DASHBOARD</NavItem>
        <NavItem active={page === 'APPS'} icon={BriefcaseBusiness} onClick={() => setPage('APPS')}>APPS</NavItem>
        <NavItem active={page === 'APPS2'} icon={CloudUpload} onClick={() => setPage('APPS2')}>APPS2</NavItem>
        {isAdmin && <><p className="nav-caption admin-caption">TEAM</p><NavItem active={page === 'TEAM'} icon={Users} onClick={() => setPage('TEAM')}>팀 업무 현황</NavItem></>}
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><strong>도움이 필요하신가요?</strong><span>ARA Workspace 가이드</span><button onClick={() => showToast('가이드가 준비되면 알려드릴게요.')}>가이드 보기 <ArrowRight size={13} /></button></div>
        <div className="profile"><button className="sidebar-profile-trigger" onClick={() => toggleProfileMenu('sidebar')} aria-label="프로필 메뉴 열기"><div className="avatar avatar-violet">{(user.name || user.username || 'A').slice(0, 1)}</div><div className="profile-copy"><strong>{user.name || user.username}</strong><span>{user.profile?.responsibility || (isAdmin ? '관리자' : 'ARA 멤버')}</span></div><MoreHorizontal size={18} className="profile-more" /></button>{profileMenuAnchor === 'sidebar' && <ProfileMenu onMyInfo={openMyInfo} onLogout={logout} />}</div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><span>ARA WORKSPACE</span><span className="crumb-sep">/</span><strong>{page === 'MY INFO' ? '나의 정보' : page}</strong></div><div className="topbar-actions"><span className="today-label">{dateLabel}</span><button className="icon-button notification" onClick={() => showToast('새로운 알림이 없습니다.')} aria-label="알림"><Bell size={18} /><i /></button><div className="topbar-profile-wrap"><button className="top-avatar avatar avatar-violet profile-avatar-button" onClick={() => toggleProfileMenu('header')} aria-label="프로필 메뉴 열기">{(user.name || user.username || 'A').slice(0, 1)}</button>{profileMenuAnchor === 'header' && <ProfileMenu onMyInfo={openMyInfo} onLogout={logout} />}</div></div></header>
      {page === 'MY DASHBOARD' && <Dashboard user={user} isAdmin={isAdmin} tasks={tasks} doneCount={doneCount} percent={percent} newTask={newTask} setNewTask={setNewTask} addTask={addTask} toggleTask={toggleTask} editTask={editTask} removeTask={removeTask} submitPlan={submitPlan} submitted={submitted} tasksLoading={tasksLoading} tasksError={tasksError} taskBusy={taskBusy} templates={templates} templatesLoading={templatesLoading} templatesBusy={templatesBusy} templatesError={templatesError} onAddTemplate={() => { setTemplateToReplace(null); templateFileRef.current?.click(); }} onDownloadTemplate={handleTemplateDownload} onReplaceTemplate={handleTemplateReplace} onDeleteTemplate={handleTemplateDelete} background={background} onPickBackground={() => fileRef.current?.click()} showToast={showToast} />}
      {page === 'APPS' && <AppsPage showToast={showToast} />}
      {page === 'APPS2' && <AppsPage showToast={showToast} alternate />}
      {page === 'TEAM' && isAdmin && <TeamPage user={user} />}
      {page === 'MY INFO' && <MyInfoPage user={user} />}
    </main>
    <input ref={fileRef} type="file" accept="image/*" hidden onChange={changeBackground} />
    <input ref={templateFileRef} type="file" accept={templateToReplace?.type === 'Word' ? '.doc,.docx' : templateToReplace?.type === 'Excel' ? '.xls,.xlsx,.xlsm' : '.doc,.docx,.xls,.xlsx,.xlsm'} hidden onChange={handleTemplateUpload} />
    {toast && <div className="toast"><Check size={16} />{toast}</div>}
  </div>;
}

function LoginPage({ onSubmit, error, busy }) {
  return <div className="login-screen"><div className="login-decoration decor-one" /><div className="login-decoration decor-two" />
    <div className="login-left"><div className="login-brand"><img src="/assets/ARA_Logo.png" alt="ARA" /><span>WORKSPACE</span></div><div className="login-message"><div className="eyebrow"><Sparkles size={14} /> YOUR WORK, IN ONE PLACE</div><h1>오늘의 업무를<br /><em>더 선명하게.</em></h1><p>하루의 시작부터 마무리까지,<br />ARA Workspace와 함께하세요.</p><div className="login-note"><div className="note-check"><Check size={15} /></div><span>오늘의 우선순위를 정하고<br />팀과 함께 목표를 완성해요.</span></div></div><div className="login-footer">© 2026 ARA Logistic · ARA Workspace</div></div>
    <div className="login-right"><form className="login-card" onSubmit={onSubmit}><div className="login-card-icon"><LockKeyhole size={20} /></div><div className="eyebrow login-eyebrow">WELCOME BACK</div><h2>로그인</h2><p className="login-subtitle">계정 정보를 입력해 대시보드에 접속하세요.</p>
      <label className="field-label" htmlFor="username">아이디</label><div className="input-wrap"><Users size={17} /><input id="username" name="username" placeholder="아이디를 입력하세요" autoComplete="username" required /></div>
      <div className="password-label"><label className="field-label" htmlFor="password">비밀번호</label><button type="button" onClick={() => window.alert('계정 담당자에게 문의해 주세요.')}>비밀번호를 잊으셨나요?</button></div><div className="input-wrap"><LockKeyhole size={17} /><input id="password" name="password" type="password" placeholder="비밀번호를 입력하세요" autoComplete="current-password" required /></div>
      {error && <div className="login-error">{error}</div>}<button className="login-button" disabled={busy}>{busy ? '확인 중…' : '로그인'} <ArrowRight size={17} /></button><div className="login-secure"><LockKeyhole size={13} /> 안전한 사내 계정으로 로그인합니다</div></form><div className="login-help">접속에 문제가 있나요? <a href="mailto:help@aralogistic.com">담당자에게 문의하기</a></div></div>
  </div>;
}

function NavItem({ active, icon: Icon, children, onClick }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}><Icon size={18} strokeWidth={active ? 2.2 : 1.8} /><span>{children}</span>{active && <span className="nav-active-mark" />}</button>; }

function ProfileMenu({ onMyInfo, onLogout }) {
  return <div className="profile-popover"><button onClick={onMyInfo}><UserRound size={16} /> 나의 정보 <ArrowRight size={14} /></button><button onClick={onLogout}><LogOut size={16} /> 로그아웃</button></div>;
}

function MyInfoPage({ user }) {
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
  return <div className="content-wrap subpage my-info-page"><div className="eyebrow">MY ACCOUNT <span className="eyebrow-dot" /> PROFILE</div><h1>나의 정보</h1><p className="subpage-lede">FileMaker에 등록된 내 직원 정보를 확인합니다.</p>
    <section className="panel my-info-card"><div className="my-info-heading"><div className="avatar avatar-violet my-info-avatar">{(profile.name || user.name || user.username || 'A').slice(0, 1)}</div><div><div className="section-eyebrow">ARA EMPLOYEE</div><h2>{profile.name || user.name || user.username}</h2><span>{profile.jobTitle || '직책 미등록'} · {profile.responsibility || '팀원'}</span>{profile.englishName && <small>{profile.englishName}</small>}</div></div>
      <div className="my-info-grid">{rows.map(([label, value]) => <div className="my-info-field" key={label}><span>{label}</span><strong>{value === undefined || value === null || value === '' ? '—' : String(value)}</strong></div>)}</div>
    </section>
  </div>;
}

function TaskRow({ task, busy, locked, onToggle, onEdit, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.text);
  const [error, setError] = useState('');

  async function saveEdit(event) {
    event.preventDefault();
    try { await onEdit(value); setEditing(false); setError(''); }
    catch (saveError) { setError(saveError.message); }
  }

  return <div className={`task-row ${task.done ? 'task-done' : ''}`}>
    <button className="task-check" onClick={onToggle} disabled={busy} aria-label={task.done ? '완료 취소' : '완료 체크'}>{task.done && <Check size={13} />}</button>
    {editing && !locked ? <form className="task-edit-form" onSubmit={saveEdit}><input value={value} onChange={event => setValue(event.target.value)} autoFocus maxLength={250} /><button disabled={!value.trim() || busy} aria-label="수정 저장"><Check size={15} /></button><button type="button" disabled={busy} onClick={() => { setValue(task.text); setEditing(false); setError(''); }} aria-label="수정 취소"><X size={15} /></button>{error && <small role="alert">{error}</small>}</form> : <div className="task-text"><span>{task.text}</span>{task.workDate && <small>{task.workDate}</small>}</div>}
    {!locked && !editing && <><button className="task-edit" disabled={busy} onClick={() => { setValue(task.text); setEditing(true); }} aria-label="업무 수정"><Settings2 size={14} /></button><button className="task-remove" disabled={busy} onClick={onRemove} aria-label="업무 삭제"><X size={15} /></button></>}
  </div>;
}

function Dashboard({ user, isAdmin, tasks, doneCount, percent, newTask, setNewTask, addTask, toggleTask, editTask, removeTask, submitPlan, submitted, tasksLoading, tasksError, taskBusy, templates, templatesLoading, templatesBusy, templatesError, onAddTemplate, onDownloadTemplate, onReplaceTemplate, onDeleteTemplate, background, onPickBackground, showToast }) {
  return <div className="content-wrap"><section className="welcome-row"><div><div className="eyebrow">TUESDAY, OCTOBER 06, 2026 <span className="eyebrow-dot" /> LET'S MAKE IT COUNT</div><h1>좋은 아침이에요, <span>{user.name || user.username}</span>님 <span className="wave">✦</span></h1><p>오늘도 차근차근, 할 수 있는 일부터 시작해 볼까요?</p></div><div className="welcome-actions"><button className="button-light" onClick={onPickBackground}><ImagePlus size={16} /> 배경 꾸미기</button>{isAdmin && <button className="button-primary" onClick={() => showToast('팀 업무 현황 메뉴에서 확인할 수 있어요.')}><Users size={16} /> 팀 업무 보기</button>}</div></section>
    <section className="hero-card" style={background ? { backgroundImage: `linear-gradient(90deg, rgba(20,30,61,.82),rgba(25,38,68,.3)),url(${background})` } : undefined}><div className="hero-content"><div className="hero-kicker"><Sparkles size={14} /> TODAY'S FOCUS</div><h2>작은 한 걸음이<br />큰 흐름을 만듭니다.</h2><p>오늘의 업무를 정하고, 하나씩 완료해 보세요.</p></div><div className="hero-stat"><div className="progress-ring" style={{ '--progress': `${percent}%` }}><div><strong>{percent}<small>%</small></strong><span>COMPLETED</span></div></div><span className="hero-stat-caption">오늘의 업무 진행률</span></div><button className="hero-image-button" onClick={onPickBackground} aria-label="배경 이미지 변경"><ImagePlus size={16} /></button></section>
    <div className="dashboard-grid"><section className="panel task-panel"><div className="panel-heading"><div><div className="section-eyebrow">MY PLAN <span className="live-dot" /></div><h2>오늘의 업무</h2></div><div className="task-count"><strong>{doneCount}</strong><span> / {tasks.length} 완료</span></div></div>
      {!submitted && <form className="add-task-form" onSubmit={addTask}><Plus size={17} /><input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="새로운 업무를 추가해 보세요" disabled={taskBusy || tasksLoading} /><button disabled={!newTask.trim() || taskBusy || tasksLoading} aria-label="업무 추가"><Plus size={17} /></button></form>}
      {tasksError && <div className="task-error" role="alert">{tasksError}</div>}
      <div className="task-list">{tasksLoading ? <div className="task-empty">오늘의 업무를 불러오는 중입니다…</div> : tasks.length ? tasks.map(task => <TaskRow key={task.id} task={task} busy={taskBusy} locked={submitted} onToggle={() => toggleTask(task)} onEdit={text => editTask(task, text)} onRemove={() => removeTask(task)} />) : <div className="task-empty">등록된 업무가 없습니다. 오늘의 업무를 추가해 보세요.</div>}</div>
      <div className="task-footer">{submitted ? <div className="locked-note"><LockKeyhole size={14} /> 오늘의 업무가 확정되어 수정할 수 없습니다.</div> : <><span className="draft-note">출근 후 오늘의 업무를 작성하고 확정해 주세요.</span><button className="submit-plan" disabled={!tasks.length || taskBusy || tasksLoading} onClick={submitPlan}>{tasks.length ? '오늘 업무 확정하기' : '업무를 추가해 주세요'} <ArrowRight size={14} /></button></>}</div>
    </section><aside className="side-stack"><section className="panel progress-panel"><div className="panel-heading compact"><div><div className="section-eyebrow">DAILY PROGRESS</div><h2>오늘의 기록</h2></div><div className="record-icon"><CheckCheck size={19} /></div></div><div className="progress-numbers"><strong>{doneCount}<small> / {tasks.length}</small></strong><span>개의 업무를 완료했어요</span></div><div className="progress-bar"><span style={{ width: `${percent}%` }} /></div><div className="progress-bottom"><span>시작이 반이에요. 계속 힘내세요!</span><span>{percent}%</span></div></section>
      <section className="panel template-panel"><div className="panel-heading compact"><div><div className="section-eyebrow">QUICK ACCESS</div><h2>내 업무 서식</h2></div><button className="template-add-button" onClick={onAddTemplate} disabled={templatesBusy}><Plus size={14} />{templatesBusy ? '저장 중…' : '서식 추가'}</button></div>
        {templatesError && <div className="template-error" role="alert">{templatesError}</div>}
        <div className="template-list">{templatesLoading ? <div className="template-empty">서식을 불러오는 중입니다…</div> : templates.length ? templates.map(template => <TemplateRow key={template.id} icon={template.type === 'Excel' ? FileSpreadsheet : FileText} tone={template.type === 'Excel' ? 'green' : 'blue'} name={template.name} type={template.type.toUpperCase()} disabled={templatesBusy} onDownload={() => onDownloadTemplate(template)} onReplace={() => onReplaceTemplate(template)} onDelete={() => onDeleteTemplate(template)} />) : <div className="template-empty">등록된 서식이 없습니다. 서식을 추가해 보세요.</div>}</div>
      </section></aside></div>
    <section className="panel team-strip"><div className="team-strip-title"><div className="section-eyebrow">YOUR TEAM</div><h2>함께하는 동료</h2></div><div className="team-members">{(user.teamMembers || []).slice(0, 4).map((person, index) => { const colors = ['violet', 'blue', 'rose', 'amber']; return <div className="mini-member" key={person.id}><div className={`avatar avatar-${colors[index % colors.length]}`}>{(person.name || '?').slice(0, 1)}</div><span><strong>{person.name}</strong><small>{person.jobTitle || '팀 동료'}</small></span></div>; })}{!user.teamMembers?.length && <span className="team-empty">{user.teamLookupMessage || '같은 팀 동료 정보가 없습니다.'}</span>}</div><div className="team-strip-aside"><div className="team-online"><i /> 동료 {user.teamMembers?.length || 0}명</div>{isAdmin && <button onClick={() => showToast('팀 업무 현황 메뉴를 열어주세요.')}>팀 현황 보기 <ArrowRight size={14} /></button>}</div></section>
    <footer className="page-footer"><span>© ARA Workspace</span><span>업무의 시작과 끝, ARA와 함께</span><button onClick={() => showToast('도움말을 준비하고 있어요.')}><CircleHelp size={14} /> 도움말</button></footer>
  </div>;
}

function TemplateRow({ icon: Icon, tone, name, type, disabled, onDownload, onReplace, onDelete }) { return <div className="template-row"><div className={`template-icon ${tone}`}><Icon size={17} /></div><span className="template-copy"><strong title={name}>{name}</strong><small>{type} 양식</small></span><button className="template-action" onClick={onDownload} disabled={disabled} aria-label={`${name} 다운로드`} title="다운로드"><ArrowDownToLine size={15} /></button><button className="template-action" onClick={onReplace} disabled={disabled} aria-label={`${name} 수정`} title="양식 교체"><Pencil size={14} /></button><button className="template-action template-delete-action" onClick={onDelete} disabled={disabled} aria-label={`${name} 삭제`} title="삭제"><Trash2 size={14} /></button></div>; }

function AppsPage({ showToast, alternate = false }) {
  return <div className="content-wrap subpage"><div className="eyebrow">ARA WORKSPACE <span className="eyebrow-dot" /> {alternate ? 'RESOURCES' : 'YOUR TOOLS'}</div><h1>{alternate ? '업무 자료실' : '자주 사용하는 앱'}</h1><p className="subpage-lede">{alternate ? '팀 업무에 필요한 서식과 자료를 한 곳에서 확인하세요.' : '업무에 필요한 도구를 빠르게 열어보세요.'}</p>
    {alternate ? <div className="panel resource-empty"><div className="empty-icon"><CloudUpload size={25} /></div><h2>자료를 준비하고 있어요</h2><p>FileMaker에 저장된 공용 서식과 업무 자료가 이곳에 표시됩니다.</p><button className="button-primary" onClick={() => showToast('FileMaker 자료실 연동이 필요합니다.')}><Download size={15} /> 자료실 새로고침</button></div> : <div className="tool-grid">{tools.map(({ name, detail, tone, icon: Icon }) => <button className="tool-card" key={name} onClick={() => showToast(`${name} 실행 연동을 설정해 주세요.`)}><div className={`tool-icon ${tone}`}><Icon size={22} /></div><div><strong>{name}</strong><span>{detail}</span></div><ArrowRight size={16} className="tool-arrow" /></button>)}</div>}
    <div className="panel apps-info"><div className="info-spark"><Sparkles size={18} /></div><div><strong>나만의 업무 환경을 만들어 보세요</strong><p>필요한 도구와 서식을 빠르게 찾을 수 있도록 정리하고 있어요.</p></div><button onClick={() => showToast('환경 설정은 준비 중이에요.')}><Settings2 size={16} /></button></div>
  </div>;
}

function TeamPage({ user }) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [tasksByEmployee, setTasksByEmployee] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const today = useMemo(() => localDateString(), []);
  const team = useMemo(() => {
    const colors = ['violet', 'blue', 'rose', 'amber'];
    const people = [
      { id: user.id, employeeId: user.employeeId, name: user.name || user.username, jobTitle: user.profile?.jobTitle, teamLeadSelection: user.profile?.teamLeadSelection, isCurrentUser: true },
      ...(user.teamMembers || []).map(person => ({ ...person, isCurrentUser: false })),
    ];
    return people.map((person, index) => ({
      ...person,
      key: String(person.employeeId || person.id || `team-member-${index}`),
      color: colors[index % colors.length],
      initials: (person.name || '?').slice(0, 1),
      role: [person.jobTitle, person.teamLeadSelection ? '팀장' : '팀원'].filter(Boolean).join(' · '),
    }));
  }, [user]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listTeamTodayWork(team.map(person => person.employeeId).filter(Boolean), today)
      .then(result => { if (active) setTasksByEmployee(result); })
      .catch(reason => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [team, today]);

  useEffect(() => {
    if (team.length && !team.some(person => person.key === selectedEmployeeId)) setSelectedEmployeeId(team[0].key);
  }, [team, selectedEmployeeId]);

  const visibleTeam = team.filter(person => person.name.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = team.find(person => person.key === selectedEmployeeId) || team[0];
  const teamStats = team.map(person => {
    const tasks = tasksByEmployee[person.employeeId] || [];
    const done = tasks.filter(task => task.done).length;
    return { tasks, done, percent: tasks.length ? Math.round(done / tasks.length * 100) : 0 };
  });
  const submittedCount = teamStats.filter(stats => stats.tasks.length > 0 && stats.tasks.every(task => task.submitted)).length;
  const completedCount = teamStats.reduce((total, stats) => total + stats.done, 0);
  const averageProgress = teamStats.length ? Math.round(teamStats.reduce((total, stats) => total + stats.percent, 0) / teamStats.length) : 0;
  const selectedTasks = selected ? tasksByEmployee[selected.employeeId] || [] : [];
  const selectedDone = selectedTasks.filter(task => task.done).length;
  const selectedPercent = selectedTasks.length ? Math.round(selectedDone / selectedTasks.length * 100) : 0;
  const dateLabel = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).format(new Date());

  return <div className="content-wrap subpage"><div className="eyebrow">ADMIN CONSOLE <span className="eyebrow-dot" /> TEAM OVERVIEW</div><div className="team-page-title"><div><h1>팀 업무 현황</h1><p className="subpage-lede">FileMaker에 등록된 팀원들의 오늘 업무와 진행 상황입니다.</p></div><div className="team-date">{dateLabel}</div></div>
    <div className="team-summary-grid"><SummaryCard label="전체 팀원" number={team.length} suffix="명" icon={Users} tone="blue" /><SummaryCard label="업무 작성 완료" number={submittedCount} suffix="명" icon={ClipboardList} tone="violet" /><SummaryCard label="완료된 업무" number={completedCount} suffix="건" icon={CheckCheck} tone="green" /><SummaryCard label="팀 평균 진행률" number={averageProgress} suffix="%" icon={Sparkles} tone="orange" /></div>
    <div className="team-layout"><section className="panel staff-panel"><div className="panel-heading"><div><div className="section-eyebrow">TEAM MEMBERS</div><h2>팀원별 업무</h2></div><div className="search-box"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="이름 검색" /></div></div>{error && <div className="task-error" role="alert">{error}</div>}<div className="staff-list">{loading ? <div className="task-empty">팀 업무를 불러오는 중입니다…</div> : visibleTeam.length ? visibleTeam.map(person => { const stats = teamStats[team.indexOf(person)]; return <button className={`staff-row ${selected?.key === person.key ? 'selected' : ''}`} key={person.key} onClick={() => setSelectedEmployeeId(person.key)}><div className={`avatar avatar-${person.color}`}>{person.initials}</div><span className="staff-name"><strong>{person.name}{person.isCurrentUser ? ' (나)' : ''}</strong><small>{person.role || '팀원'}</small></span><span className="staff-completion">{stats.done}/{stats.tasks.length}<small> 완료</small></span><div className="staff-arrow"><ArrowRight size={15} /></div></button>; }) : <div className="task-empty">표시할 팀원이 없습니다.</div>}</div></section>
      {selected && <section className="panel selected-staff-panel"><div className="staff-detail-head"><div className={`avatar avatar-${selected.color} large-avatar`}>{selected.initials}</div><div><div className="section-eyebrow">TODAY'S PLAN</div><h2>{selected.name}{selected.isCurrentUser ? ' (나)' : ''}</h2><span>{selected.role || '팀원'}</span></div></div><div className="staff-detail-progress"><div><span>업무 진행률</span><strong>{selectedPercent}%</strong></div><div className="progress-bar"><span style={{ width: `${selectedPercent}%` }} /></div></div><div className="staff-task-title">오늘의 업무 <span>{selectedDone}/{selectedTasks.length} 완료</span></div><div className="staff-task-list">{loading ? <div className="task-empty">불러오는 중입니다…</div> : selectedTasks.length ? selectedTasks.map(task => <div className="staff-task" key={task.id}><span className={`task-check static ${task.done ? 'checked' : ''}`}>{task.done && <Check size={12} />}</span><span className={task.done ? 'crossed' : ''}>{task.text}</span><small>{task.done ? '완료' : '진행 중'}</small></div>) : <div className="task-empty">오늘 등록한 업무가 없습니다.</div>}</div></section>}</div>
  </div>;
}
function SummaryCard({ label, number, suffix, icon: Icon, tone }) { return <div className="panel summary-card"><div className={`summary-icon ${tone}`}><Icon size={18} /></div><div><span>{label}</span><strong>{number}<small>{suffix}</small></strong></div></div>; }

export default App;
