import { ArrowRight, LogOut, UserRound } from 'lucide-react';

export default function ProfileMenu({ onMyInfo, onLogout }) {
  return (
    <div className="profile-popover">
      <button
        onClick={(event) => {
          event.stopPropagation();
          onMyInfo();
        }}
      >
        <UserRound size={16} /> 나의 정보 <ArrowRight size={14} />
      </button>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onLogout();
        }}
      >
        <LogOut size={16} /> 로그아웃
      </button>
    </div>
  );
}
