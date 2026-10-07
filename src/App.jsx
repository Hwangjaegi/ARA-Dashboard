import { useEffect, useMemo, useRef, useState } from 'react';
import { login } from './services/auth';
import { getDashboardBackground, saveDashboardBackground } from './services/dashboardBackground';
import {
  createTodayWork,
  deleteTodayWork,
  listTodayWork,
  localDateString,
  updateTodayWork,
} from './services/todayWork';
import {
  deleteWorkTemplate,
  downloadWorkTemplate,
  listWorkTemplates,
  saveWorkTemplate,
} from './services/workTemplates';
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Check,
  CircleHelp,
  CloudUpload,
  LayoutDashboard,
  MoreHorizontal,
  Users,
} from 'lucide-react';
import AppsPage from './pages/AppsPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import MyInfoPage from './pages/MyInfoPage';
import TeamPage from './pages/TeamPage';
import GuidePage from './pages/GuidePage';
import NavItem from './components/NavItem';
import ProfileMenu from './components/ProfileMenu';

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ara-user'));
    } catch {
      return null;
    }
  });
  const [page, setPage] = useState('MY DASHBOARD');
  const [workDate, setWorkDate] = useState(localDateString());
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
  const [background, setBackground] = useState('');
  const [loginError, setLoginError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const fileRef = useRef(null);
  const templateFileRef = useRef(null);
  const backgroundObjectUrlRef = useRef('');
  const sidebarProfileRef = useRef(null);
  const headerProfileRef = useRef(null);
  const isAdmin = user?.role === 'admin';
  const doneCount = tasks.filter((t) => t.done).length;
  const percent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    if (!profileMenuAnchor) return undefined;

    function closeOnOutsideClick(event) {
      const activeProfileRef =
        profileMenuAnchor === 'sidebar' ? sidebarProfileRef : headerProfileRef;
      if (!activeProfileRef.current?.contains(event.target)) {
        setProfileMenuAnchor(null);
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [profileMenuAnchor]);

  function setDashboardBackground(image) {
    const previousObjectUrl = backgroundObjectUrlRef.current;
    if (previousObjectUrl && previousObjectUrl !== image) URL.revokeObjectURL(previousObjectUrl);
    backgroundObjectUrlRef.current = image.startsWith('blob:') ? image : '';
    setBackground(image);
  }

  useEffect(() => {
    if (!user?.employeeId) return;
    let active = true;
    setTasksLoading(true);
    setTasksError('');
    listTodayWork(user.employeeId, workDate)
      .then((records) => {
        if (active) {
          setTasks(records);
          setSubmitted(records.length > 0 && records.every((task) => task.submitted));
        }
      })
      .catch((error) => {
        if (active) setTasksError(error.message);
      })
      .finally(() => {
        if (active) setTasksLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.employeeId, workDate]);

  useEffect(() => {
    if (!user?.employeeId) return;
    let active = true;
    setTemplatesLoading(true);
    setTemplatesError('');
    listWorkTemplates(user.employeeId)
      .then((items) => {
        if (active) setTemplates(items);
      })
      .catch((error) => {
        if (active) setTemplatesError(error.message);
      })
      .finally(() => {
        if (active) setTemplatesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.employeeId]);

  useEffect(() => {
    if (!user?.employeeId) {
      setDashboardBackground('');
      return;
    }
    let active = true;
    let loadedObjectUrl = '';
    setDashboardBackground('');
    getDashboardBackground(user.employeeId)
      .then((image) => {
        if (active) {
          loadedObjectUrl = image;
          setDashboardBackground(image);
        } else if (image) {
          URL.revokeObjectURL(image);
        }
      })
      .catch((error) => {
        if (active) showToast(`대시보드 배경을 불러오지 못했습니다. ${error.message}`);
      });
    return () => {
      active = false;
      if (loadedObjectUrl) URL.revokeObjectURL(loadedObjectUrl);
    };
  }, [user?.employeeId]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError('');
    setBusy(true);
    try {
      const result = await login(
        event.currentTarget.username.value.trim(),
        event.currentTarget.password.value,
      );
      setUser(result.user);
      localStorage.setItem('ara-user', JSON.stringify(result.user));
    } catch (error) {
      setLoginError(
        error.message === 'Failed to fetch'
          ? '인증 서버에 연결할 수 없습니다. 서버 설정을 확인해 주세요.'
          : error.message,
      );
    } finally {
      setBusy(false);
    }
  }
  function logout() {
    setProfileMenuAnchor(null);
    setUser(null);
    setBackground('');
    localStorage.removeItem('ara-user');
  }
  function toggleProfileMenu(anchor) {
    setProfileMenuAnchor((current) => (current === anchor ? null : anchor));
  }
  function openMyInfo() {
    setPage('MY INFO');
    setProfileMenuAnchor(null);
  }
  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }
  async function addTask(event) {
    event.preventDefault();
    if (!newTask.trim() || taskBusy || submitted || workDate !== localDateString()) return;
    setTaskBusy(true);
    setTasksError('');
    try {
      const task = await createTodayWork(user.employeeId, newTask.trim(), workDate);
      setTasks((current) => [...current, task]);
      setNewTask('');
    } catch (error) {
      setTasksError(error.message);
    } finally {
      setTaskBusy(false);
    }
  }
  async function toggleTask(task) {
    if (workDate !== localDateString()) return;
    const done = !task.done;
    setTaskBusy(true);
    setTasksError('');
    try {
      await updateTodayWork(task.id, { WorkCompleted: done ? 1 : 0 });
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? { ...item, done } : item)),
      );
    } catch (error) {
      setTasksError(error.message);
    } finally {
      setTaskBusy(false);
    }
  }
  async function editTask(task, text) {
    const trimmed = text.trim();
    if (!trimmed || trimmed === task.text || submitted || workDate !== localDateString()) return;
    if (submitted) return;
    setTaskBusy(true);
    setTasksError('');
    try {
      await updateTodayWork(task.id, { WorkPlan: trimmed });
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? { ...item, text: trimmed } : item)),
      );
    } catch (error) {
      setTasksError(error.message);
      throw error;
    } finally {
      setTaskBusy(false);
    }
  }
  async function submitPlan() {
    if (!tasks.length || taskBusy || submitted || workDate !== localDateString()) return;
    setTaskBusy(true);
    setTasksError('');
    try {
      await Promise.all(tasks.map((task) => updateTodayWork(task.id, { WorkPlanSubmitted: 1 })));
      setTasks((current) => current.map((task) => ({ ...task, submitted: true })));
      setSubmitted(true);
      showToast('오늘의 업무가 확정되었습니다.');
    } catch (error) {
      setTasksError(
        `업무 확정 중 오류가 발생했습니다. ${error.message} 일부 업무만 잠겼을 수 있어 새로고침 후 확인해 주세요.`,
      );
    } finally {
      setTaskBusy(false);
    }
  }
  async function removeTask(task) {
    if (submitted || workDate !== localDateString()) return;
    setTaskBusy(true);
    setTasksError('');
    try {
      await deleteTodayWork(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
    } catch (error) {
      setTasksError(error.message);
    } finally {
      setTaskBusy(false);
    }
  }
  async function changeBackground(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      await saveDashboardBackground(user.employeeId, file);
      setDashboardBackground(URL.createObjectURL(file));
      showToast('대시보드 배경을 FileMaker에 저장했습니다.');
    } catch (error) {
      showToast(`대시보드 배경을 저장하지 못했습니다. ${error.message}`);
    }
  }
  async function handleTemplateUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      setTemplateToReplace(null);
      return;
    }
    const replacing = templateToReplace;
    setTemplateToReplace(null);
    const extension = file.name.split('.').pop()?.toLowerCase();
    const type = ['doc', 'docx'].includes(extension)
      ? 'Word'
      : ['xls', 'xlsx', 'xlsm'].includes(extension)
        ? 'Excel'
        : '';
    if (!type) {
      setTemplatesError(
        'Word(.doc, .docx) 또는 Excel(.xls, .xlsx, .xlsm) 파일만 업로드할 수 있습니다.',
      );
      return;
    }
    if (replacing && type !== replacing.type) {
      setTemplatesError(`${replacing.type} 서식은 같은 종류의 파일로만 교체할 수 있습니다.`);
      return;
    }
    setTemplatesBusy(true);
    setTemplatesError('');
    try {
      const saved = await saveWorkTemplate(user.employeeId, file, type, replacing);
      setTemplates((current) => {
        const next = replacing
          ? current.map((item) => (item.id === replacing.id ? saved : item))
          : [...current, saved];
        return next.sort(
          (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name, 'ko'),
        );
      });
      showToast(replacing ? `${type} 서식을 교체했습니다.` : `${type} 서식을 저장했습니다.`);
    } catch (error) {
      setTemplatesError(error.message);
    } finally {
      setTemplatesBusy(false);
    }
  }
  async function handleTemplateDownload(template) {
    setTemplatesError('');
    try {
      await downloadWorkTemplate(template, user.employeeId);
    } catch (error) {
      setTemplatesError(error.message);
    }
  }
  async function handleTemplateDelete(template) {
    if (!window.confirm(`“${template.name}” 서식을 삭제할까요?`)) return;
    setTemplatesBusy(true);
    setTemplatesError('');
    try {
      await deleteWorkTemplate(user.employeeId, template);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      showToast('서식을 삭제했습니다.');
    } catch (error) {
      setTemplatesError(error.message);
    } finally {
      setTemplatesBusy(false);
    }
  }
  function handleTemplateReplace(template) {
    setTemplatesError('');
    setTemplateToReplace(template);
    templateFileRef.current?.click();
  }

  if (!user) return <LoginPage onSubmit={handleLogin} error={loginError} busy={busy} />;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}assets/ARA_Logo.png`} alt="ARA" />
          <span className="brand-rule" />
          <span className="brand-caption">WORKSPACE</span>
        </div>
        <nav className="main-nav">          
          <NavItem
            active={page === 'MY DASHBOARD'}
            icon={LayoutDashboard}
            onClick={() => setPage('MY DASHBOARD')}
          >
            MY WORKSPACE
          </NavItem>
          <NavItem
            active={page === 'ERP'}
            icon={BriefcaseBusiness}
            onClick={() => setPage('ERP')}
          >
            ERP
          </NavItem>
          <NavItem active={page === 'APPS'} icon={CloudUpload} onClick={() => setPage('APPS')}>
            APPS
          </NavItem>
          {isAdmin && (
            <>
              <p className="nav-caption admin-caption">TEAM</p>
              <NavItem active={page === 'TEAM'} icon={Users} onClick={() => setPage('TEAM')}>
                팀 업무 현황
              </NavItem>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <CircleHelp size={17} />
            </div>
            <strong>도움이 필요하신가요?</strong>
            <span>ARA Workspace 가이드</span>
            <button onClick={() => setPage('GUIDE')}>
              가이드 보기 <ArrowRight size={13} />
            </button>
          </div>
          <div className="profile" ref={sidebarProfileRef}>
            <button
              className="sidebar-profile-trigger"
              onClick={() => toggleProfileMenu('sidebar')}
              aria-label="프로필 메뉴 열기"
            >
              <div className="avatar avatar-violet">
                {(user.name || user.username || 'A').slice(0, 1)}
              </div>
              <div className="profile-copy">
                <strong>{user.name || user.username}</strong>
                <span>{user.profile?.responsibility || (isAdmin ? '관리자' : 'ARA 멤버')}</span>
              </div>
              <MoreHorizontal size={18} className="profile-more" />
            </button>
            {profileMenuAnchor === 'sidebar' && (
              <ProfileMenu onMyInfo={openMyInfo} onLogout={logout} />
            )}
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>ARA WORKSPACE</span>
            <span className="crumb-sep">/</span>
            <strong>
              {page === 'MY INFO'
                ? '나의 정보'
                : page === 'GUIDE'
                  ? '사용자 가이드'
                  : page === 'MY DASHBOARD'
                    ? 'MY WORKSPACE'
                    : page === 'ERP'
                      ? 'ERP'
                      : page === 'APPS'
                        ? 'APPS'
                        : page}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="today-label">{dateLabel}</span>
            <button
              className="icon-button notification"
              onClick={() => showToast('새로운 알림이 없습니다.')}
              aria-label="알림"
            >
              <Bell size={18} />
              <i />
            </button>
            <div className="topbar-profile-wrap" ref={headerProfileRef}>
              <button
                className="top-avatar avatar avatar-violet profile-avatar-button"
                onClick={() => toggleProfileMenu('header')}
                aria-label="프로필 메뉴 열기"
              >
                {(user.name || user.username || 'A').slice(0, 1)}
              </button>
              {profileMenuAnchor === 'header' && (
                <ProfileMenu onMyInfo={openMyInfo} onLogout={logout} />
              )}
            </div>
          </div>
        </header>
        {page === 'MY DASHBOARD' && (
          <DashboardPage
            user={user}
            isAdmin={isAdmin}
            tasks={tasks}
            doneCount={doneCount}
            percent={percent}
            newTask={newTask}
            setNewTask={setNewTask}
            addTask={addTask}
            toggleTask={toggleTask}
            editTask={editTask}
            removeTask={removeTask}
            submitPlan={submitPlan}
            submitted={submitted}
            workDate={workDate}
            onWorkDateChange={(date) => {
              setWorkDate(date);
              setNewTask('');
            }}
            tasksLoading={tasksLoading}
            tasksError={tasksError}
            taskBusy={taskBusy}
            templates={templates}
            templatesLoading={templatesLoading}
            templatesBusy={templatesBusy}
            templatesError={templatesError}
            onAddTemplate={() => {
              setTemplateToReplace(null);
              templateFileRef.current?.click();
            }}
            onDownloadTemplate={handleTemplateDownload}
            onReplaceTemplate={handleTemplateReplace}
            onDeleteTemplate={handleTemplateDelete}
            background={background}
            onPickBackground={() => fileRef.current?.click()}
            onNavigateTeam={() => setPage('TEAM')}
            showToast={showToast}
          />
        )}
        {page === 'ERP' && (
          <AppsPage employeeId={user.employeeId} scriptName="WebLogin_ERP_MyWorkSpace" />
        )}
        {page === 'APPS' && (
          <AppsPage employeeId={user.employeeId} scriptName="WebLogin_Apps_MyWorkSpace" />
        )}
        {page === 'TEAM' && isAdmin && <TeamPage user={user} />}
        {page === 'MY INFO' && <MyInfoPage user={user} />}
        {page === 'GUIDE' && <GuidePage isAdmin={isAdmin} onBack={() => setPage('MY DASHBOARD')} />}
      </main>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={changeBackground} />
      <input
        ref={templateFileRef}
        type="file"
        accept={
          templateToReplace?.type === 'Word'
            ? '.doc,.docx'
            : templateToReplace?.type === 'Excel'
              ? '.xls,.xlsx,.xlsm'
              : '.doc,.docx,.xls,.xlsx,.xlsm'
        }
        hidden
        onChange={handleTemplateUpload}
      />
      {toast && (
        <div className="toast">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
