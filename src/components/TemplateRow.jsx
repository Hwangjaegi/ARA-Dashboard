import { ArrowDownToLine, FileSpreadsheet, FileText, Pencil, Trash2 } from 'lucide-react';

export default function TemplateRow({
  icon: Icon,
  tone,
  name,
  type,
  disabled,
  onDownload,
  onReplace,
  onDelete,
}) {
  return (
    <div className="template-row">
      <div className={`template-icon ${tone}`}>
        <Icon size={17} />
      </div>
      <span className="template-copy">
        <strong title={name}>{name}</strong>
        <small>{type} 양식</small>
      </span>
      <button
        className="template-action"
        onClick={onDownload}
        disabled={disabled}
        aria-label={`${name} 다운로드`}
        title="다운로드"
      >
        <ArrowDownToLine size={15} />
      </button>
      <button
        className="template-action"
        onClick={onReplace}
        disabled={disabled}
        aria-label={`${name} 수정`}
        title="양식 교체"
      >
        <Pencil size={14} />
      </button>
      <button
        className="template-action template-delete-action"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`${name} 삭제`}
        title="삭제"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
