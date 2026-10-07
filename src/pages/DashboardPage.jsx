import {
  ArrowRight,
  CircleHelp,
  FileSpreadsheet,
  FileText,
  ImagePlus,
  LockKeyhole,
  Plus,
  Sparkles,
} from 'lucide-react';
import DatePicker from '../components/DatePicker';
import TaskRow from '../components/TaskRow';
import TemplateRow from '../components/TemplateRow';
import { localDateString } from '../services/todayWork';

export default function DashboardPage({
  user,
  isAdmin,
  tasks,
  doneCount,
  percent,
  newTask,
  setNewTask,
  addTask,
  toggleTask,
  editTask,
  removeTask,
  submitPlan,
  submitted,
  workDate,
  onWorkDateChange,
  tasksLoading,
  tasksError,
  taskBusy,
  templates,
  templatesLoading,
  templatesBusy,
  templatesError,
  onAddTemplate,
  onDownloadTemplate,
  onReplaceTemplate,
  onDeleteTemplate,
  background,
  onPickBackground,
  onNavigateTeam,
  showToast,
}) {
  const today = localDateString();
  const historical = workDate !== today;
  return (
    <div className="content-wrap dashboard-content">
      <section
        className="hero-card"
        style={
          background
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(20,30,61,.82),rgba(25,38,68,.3)),url(${background})`,
              }
            : undefined
        }
      >
        <div className="hero-content">
          <div className="hero-kicker">
            <Sparkles size={14} /> {historical ? 'WORK HISTORY' : 'MY WORKSPACE'}
          </div>
          <h2>
            좋은 아침이에요, <span>{user.name || user.username}</span>님
          </h2>
          <p>
            {historical
              ? '선택한 날짜의 업무 기록을 확인하고 있어요.'
              : '오늘도 차근차근, 할 수 있는 일부터 시작해 볼까요?'}
          </p>
        </div>
        <div className="hero-stat">
          <div className="progress-ring" style={{ '--progress': `${percent}%` }}>
            <div>
              <strong>
                {percent}
                <small>%</small>
              </strong>
              <span>COMPLETED</span>
            </div>
          </div>
          <div className="hero-stat-copy">
            <span className="hero-stat-caption">오늘의 업무 진행률</span>
            <strong>{doneCount} / {tasks.length}개 완료</strong>
          </div>
        </div>
        <button
          className="hero-image-button"
          onClick={onPickBackground}
          aria-label="배경 이미지 변경"
        >
          <ImagePlus size={16} />
        </button>
      </section>
      <div className="dashboard-grid">
        <section className="panel task-panel">
          <div className="panel-heading">
            <div>
              <div className="section-eyebrow">
                MY PLAN <span className="live-dot" />
              </div>
              <h2>{historical ? '선택 날짜 업무' : '오늘의 업무'}</h2>
            </div>
            <div className="task-heading-actions">
              <DatePicker value={workDate} max={today} onChange={onWorkDateChange} compact />
            </div>
          </div>
          {!submitted && !historical && (
            <form className="add-task-form" onSubmit={addTask}>
              <Plus size={17} />
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="새로운 업무를 추가해 보세요"
                disabled={taskBusy || tasksLoading}
              />
              <button disabled={!newTask.trim() || taskBusy || tasksLoading} aria-label="업무 추가">
                <Plus size={17} />
              </button>
            </form>
          )}
          {tasksError && (
            <div className="task-error" role="alert">
              {tasksError}
            </div>
          )}
          <div className="task-list">
            {tasksLoading ? (
              <div className="task-empty">업무 기록을 불러오는 중입니다…</div>
            ) : tasks.length ? (
              tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  busy={taskBusy}
                  locked={submitted || historical}
                  onToggle={() => toggleTask(task)}
                  onEdit={(text) => editTask(task, text)}
                  onRemove={() => removeTask(task)}
                />
              ))
            ) : (
              <div className="task-empty">
                {historical
                  ? '선택한 날짜에 등록된 업무가 없습니다.'
                  : '등록된 업무가 없습니다. 오늘의 업무를 추가해 보세요.'}
              </div>
            )}
          </div>
          <div className="task-footer">
            {historical ? (
              <div className="locked-note">
                <LockKeyhole size={14} /> 이전 날짜의 업무 기록은 조회만 할 수 있습니다.
              </div>
            ) : submitted ? (
              <div className="locked-note">
                <LockKeyhole size={14} /> 오늘의 업무가 확정되어 수정할 수 없습니다.
              </div>
            ) : (
              <>
                <span className="draft-note">출근 후 오늘의 업무를 작성하고 확정해 주세요.</span>
                <button
                  className="submit-plan"
                  disabled={!tasks.length || taskBusy || tasksLoading}
                  onClick={submitPlan}
                >
                  {tasks.length ? '오늘 업무 확정하기' : '업무를 추가해 주세요'}{' '}
                  <ArrowRight size={14} />
                </button>
              </>
            )}
          </div>
        </section>
        <aside className="side-stack">
          <section className="panel template-panel">
            <div className="panel-heading compact">
              <div>
                <div className="section-eyebrow">QUICK ACCESS</div>
                <h2>내 업무 서식</h2>
              </div>
              <button
                className="template-add-button"
                onClick={onAddTemplate}
                disabled={templatesBusy}
              >
                <Plus size={14} />
                {templatesBusy ? '저장 중…' : '서식 추가'}
              </button>
            </div>
            {templatesError && (
              <div className="template-error" role="alert">
                {templatesError}
              </div>
            )}
            <div className="template-list">
              {templatesLoading ? (
                <div className="template-empty">서식을 불러오는 중입니다…</div>
              ) : templates.length ? (
                templates.map((template) => (
                  <TemplateRow
                    key={template.id}
                    icon={template.type === 'Excel' ? FileSpreadsheet : FileText}
                    tone={template.type === 'Excel' ? 'green' : 'blue'}
                    name={template.name}
                    type={template.type.toUpperCase()}
                    disabled={templatesBusy}
                    onDownload={() => onDownloadTemplate(template)}
                    onReplace={() => onReplaceTemplate(template)}
                    onDelete={() => onDeleteTemplate(template)}
                  />
                ))
              ) : (
                <div className="template-empty">등록된 서식이 없습니다. 서식을 추가해 보세요.</div>
              )}
            </div>
          </section>
        </aside>
      </div>
      <section className="panel team-strip">
        <div className="team-strip-title">
          <div className="section-eyebrow">YOUR TEAM</div>
          <h2>팀원 내역</h2>
        </div>
        <div className="team-members">
          {(user.teamMembers || []).map((person, index) => {
            const colors = ['violet', 'blue', 'rose', 'amber'];
            return (
              <div className="mini-member" key={person.id}>
                <div className={`avatar avatar-${colors[index % colors.length]}`}>
                  {(person.name || '?').slice(0, 1)}
                </div>
                <span>
                  <strong>{person.name}</strong>
                  <small>{person.jobTitle || '팀 동료'}</small>
                </span>
              </div>
            );
          })}
          {!user.teamMembers?.length && (
            <span className="team-empty">
              {user.teamLookupMessage || '같은 팀 동료 정보가 없습니다.'}
            </span>
          )}
        </div>
        <div className="team-strip-aside">
          <div className="team-online">
            <i /> 동료 {user.teamMembers?.length || 0}명
          </div>
          {isAdmin && (
            <button onClick={onNavigateTeam}>
              팀 현황 보기 <ArrowRight size={14} />
            </button>
          )}
        </div>
      </section>
      <footer className="page-footer">
        <span>© ARA Workspace</span>
        <span>업무의 시작과 끝, ARA와 함께</span>        
      </footer>
    </div>
  );
}
