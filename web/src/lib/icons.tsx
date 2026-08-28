import type { SVGProps } from 'react';
import type { Difficulty, WaypointType } from './types';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

// Ícono propio de reacción: un pico de montaña, nunca un corazón.
export function MountainOutlineIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 19L9.5 8L13 14L15.5 10L21 19H3Z" />
    </svg>
  );
}

export function MountainFilledIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M3 19L9.5 8L13 14L15.5 10L21 19H3Z" />
    </svg>
  );
}

export function SearchIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function HomeIcon({ size = 21, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

export function CompassIcon({ size = 21, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

export function UserIcon({ size = 21, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

export function PlusIcon({ size = 22, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      {...props}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

const WAYPOINT_ICON_PATHS: Record<WaypointType, string> = {
  REFUGIO: 'M3 11l9-7 9 7M5 10v10h14V10',
  AGUA: 'M12 3C9 7 6 10.5 6 14a6 6 0 0012 0c0-3.5-3-7-6-11z',
  MIRADOR: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z',
  PELIGRO: 'M12 2L2 21h20L12 2z',
  CAMPAMENTO: 'M4 21V10l8-6 8 6v11M4 21h16',
  TECNICA: 'M5 21V4M5 4h11l-3 4 3 4H5',
};

export function WaypointTypeIcon({
  type,
  size = 18,
  ...props
}: IconProps & { type: WaypointType }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinejoin="round"
      {...props}
    >
      <path d={WAYPOINT_ICON_PATHS[type]} />
    </svg>
  );
}

export const WAYPOINT_TYPE_LABEL: Record<WaypointType, string> = {
  REFUGIO: 'Refugio',
  AGUA: 'Agua',
  MIRADOR: 'Mirador',
  PELIGRO: 'Peligro',
  CAMPAMENTO: 'Campamento',
  TECNICA: 'Técnica',
};

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  FACIL: 'var(--pine)',
  MEDIA: 'var(--amber)',
  DIFICIL: 'var(--danger)',
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  FACIL: 'Fácil',
  MEDIA: 'Media',
  DIFICIL: 'Difícil',
};
