import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCheck,
  ClipboardList,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import SummaryCard from '../components/SummaryCard';
import { listTeamTodayWork, localDateString } from '../services/todayWork';

export default function TeamPage({ user }) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [tasksByEmployee, setTasksByEmployee] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(localDateString());
  const today = localDateString();
  const team = useMemo(() => {
    const colors = ['violet', 'blue', 'rose', 'amber'];
    const people = [
      {
        id: user.id,
        employeeId: user.employeeId,
        name: user.name || user.username,
        jobTitle: user.profile?.jobTitle,
        teamLeadSelection: user.profile?.teamLeadSelection,
        isCurrentUser: true,
      },
      ...(user.teamMembers || []).map((person) => ({ ...person, isCurrentUser: false })),
    ];
    return people.map((person, index) => ({
      ...person,
      key: String(person.employeeId || person.id || `team-member-${index}`),
      color: colors[index % colors.length],
      initials: (person.name || '?').slice(0, 1),
      role: [person.jobTitle, person.teamLeadSelection ? '팀장' : '팀원']
        .filter(Boolean)
        .join(' · '),
    }));
  }, [user]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listTeamTodayWork(team.map((person) => person.employeeId).filter(Boolean), selectedDate)
      .then((result) => {
        if (active) setTasksByEmployee(result);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [team, selectedDate]);

  useEffect(() => {
    if (team.length && !team.some((person) => person.key === selectedEmployeeId))
      setSelectedEmployeeId(team[0].key);
  }, [team, selectedEmployeeId]);

  const visibleTeam = team.filter((person) =>
    person.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const selected = team.find((person) => person.key === selectedEmployeeId) || team[0];
  const teamStats = team.map((person) => {
    const tasks = tasksByEmployee[person.employeeId] || [];
    const done = tasks.filter((task) => task.done).length;
    return { tasks, done, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
  });
  const submittedCount = teamStats.filter(
    (stats) => stats.tasks.length > 0 && stats.tasks.every((task) => task.submitted),
  ).length;
  const completedCount = teamStats.reduce((total, stats) => total + stats.done, 0);
  const averageProgress = teamStats.length
    ? Math.round(teamStats.reduce((total, stats) => total + stats.percent, 0) / teamStats.length)
    : 0;
  const selectedTasks = selected ? tasksByEmployee[selected.employeeId] || [] : [];
  const selectedDone = selectedTasks.filter((task) => task.done).length;
  const selectedPercent = selectedTasks.length
    ? Math.round((selectedDone / selectedTasks.length) * 100)
    : 0;
  const dateLabel = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(new Date(`${selectedDate}T00:00:00`));

  return (
    <div className="content-wrap subpage">
      <div className="eyebrow">
        ADMIN CONSOLE <span className="eyebrow-dot" /> TEAM OVERVIEW
      </div>
      <div className="team-page-title">
        <div>
          <h1>팀 업무 현황</h1>
          <p className="subpage-lede">날짜를 선택해 팀원들의 업무와 진행 상황을 확인하세요.</p>
        </div>
        <div className="team-date">
          <CalendarDays size={15} />
          <input
            aria-label="조회할 업무 날짜"
            type="date"
            value={selectedDate}
            max={today}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
          {selectedDate !== today && (
            <button type="button" onClick={() => setSelectedDate(today)}>
              오늘
            </button>
          )}
        </div>
      </div>
      <div className="team-summary-grid">
        <SummaryCard label="전체 팀원" number={team.length} suffix="명" icon={Users} tone="blue" />
        <SummaryCard
          label="업무 작성 완료"
          number={submittedCount}
          suffix="명"
          icon={ClipboardList}
          tone="violet"
        />
        <SummaryCard
          label="완료된 업무"
          number={completedCount}
          suffix="건"
          icon={CheckCheck}
          tone="green"
        />
        <SummaryCard
          label="팀 평균 진행률"
          number={averageProgress}
          suffix="%"
          icon={Sparkles}
          tone="orange"
        />
      </div>
      <div className="team-layout">
        <section className="panel staff-panel">
          <div className="panel-heading">
            <div>
              <div className="section-eyebrow">TEAM MEMBERS</div>
              <h2>팀원별 업무</h2>
            </div>
            <div className="search-box">
              <Search size={15} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="이름 검색"
              />
            </div>
          </div>
          {error && (
            <div className="task-error" role="alert">
              {error}
            </div>
          )}
          <div className="staff-list">
            {loading ? (
              <div className="task-empty">팀 업무를 불러오는 중입니다…</div>
            ) : visibleTeam.length ? (
              visibleTeam.map((person) => {
                const stats = teamStats[team.indexOf(person)];
                return (
                  <button
                    className={`staff-row ${selected?.key === person.key ? 'selected' : ''}`}
                    key={person.key}
                    onClick={() => setSelectedEmployeeId(person.key)}
                  >
                    <div className={`avatar avatar-${person.color}`}>{person.initials}</div>
                    <span className="staff-name">
                      <strong>
                        {person.name}
                        {person.isCurrentUser ? ' (나)' : ''}
                      </strong>
                      <small>{person.role || '팀원'}</small>
                    </span>
                    <span className="staff-completion">
                      {stats.done}/{stats.tasks.length}
                      <small> 완료</small>
                    </span>
                    <div className="staff-arrow">
                      <ArrowRight size={15} />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="task-empty">표시할 팀원이 없습니다.</div>
            )}
          </div>
        </section>
        {selected && (
          <section className="panel selected-staff-panel">
            <div className="staff-detail-head">
              <div className={`avatar avatar-${selected.color} large-avatar`}>
                {selected.initials}
              </div>
              <div>
                <div className="section-eyebrow">TODAY'S PLAN</div>
                <h2>
                  {selected.name}
                  {selected.isCurrentUser ? ' (나)' : ''}
                </h2>
                <span>{selected.role || '팀원'}</span>
              </div>
            </div>
            <div className="staff-detail-progress">
              <div>
                <span>업무 진행률</span>
                <strong>{selectedPercent}%</strong>
              </div>
              <div className="progress-bar">
                <span style={{ width: `${selectedPercent}%` }} />
              </div>
            </div>
            <div className="staff-task-title">
              오늘의 업무{' '}
              <span>
                {selectedDone}/{selectedTasks.length} 완료
              </span>
            </div>
            <div className="staff-task-list">
              {loading ? (
                <div className="task-empty">불러오는 중입니다…</div>
              ) : selectedTasks.length ? (
                selectedTasks.map((task) => (
                  <div className="staff-task" key={task.id}>
                    <span className={`task-check static ${task.done ? 'checked' : ''}`}>
                      {task.done && <Check size={12} />}
                    </span>
                    <span className={task.done ? 'crossed' : ''}>{task.text}</span>
                    <small>{task.done ? '완료' : '진행 중'}</small>
                  </div>
                ))
              ) : (
                <div className="task-empty">오늘 등록한 업무가 없습니다.</div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
