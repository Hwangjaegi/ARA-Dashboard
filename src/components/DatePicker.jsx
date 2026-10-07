import { CalendarDays } from 'lucide-react';

export default function DatePicker({ value, max, onChange, compact = false }) {
  return (
    <div className={`team-date date-picker${compact ? ' compact' : ''}`}>
      <CalendarDays size={15} />
      <input
        aria-label="조회할 업무 날짜"
        type="date"
        value={value}
        max={max}
        onChange={(event) => onChange(event.target.value)}
      />
      {value !== max && (
        <button type="button" onClick={() => onChange(max)}>
          오늘
        </button>
      )}
    </div>
  );
}
