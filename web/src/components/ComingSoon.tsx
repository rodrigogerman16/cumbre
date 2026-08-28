import { MountainOutlineIcon } from '../lib/icons';

export function ComingSoon({ title, message }: { title: string; message: string }) {
  return (
    <>
      <div className="topbar">
        <div className="brand">
          <MountainOutlineIcon size={22} color="var(--ink)" />
          {title}
        </div>
      </div>
      <div className="empty-state">{message}</div>
    </>
  );
}
