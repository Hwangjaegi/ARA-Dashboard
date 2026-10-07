export default function NavItem({ active, icon: Icon, children, onClick }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
      <span>{children}</span>
      {active && <span className="nav-active-mark" />}
    </button>
  );
}
