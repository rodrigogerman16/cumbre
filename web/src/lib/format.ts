export function pluralDias(count: number): string {
  return `${count} día${count === 1 ? '' : 's'}`;
}

export function initials(name: string | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
