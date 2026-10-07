export default function SummaryCard({ label, number, suffix, icon: Icon, tone }) {
  return (
    <div className="panel summary-card">
      <div className={`summary-icon ${tone}`}>
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>
          {number}
          <small>{suffix}</small>
        </strong>
      </div>
    </div>
  );
}
