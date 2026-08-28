// Inline SVG icons, stroke-based, reused across pages. `fill` variants are
// used for the "active" reaction state.

export const iconMountainOutline = (color = "currentColor", size = 20) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"><path d="M3 19L9.5 8L13 14L15.5 10L21 19H3Z"/></svg>`;

export const iconMountainFilled = (color = "#C1592B", size = 20) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="none"><path d="M3 19L9.5 8L13 14L15.5 10L21 19H3Z"/></svg>`;

export const iconBack = (color = "#1E2A1F", size = 18) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`;

export const iconClose = (color = "#1E2A1F", size = 16) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;

export const iconSearch = (color = "#1E2A1F", size = 18) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;

export const iconBookmark = (color = "#5B6B5A", size = 17, filled = false) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? color : "none"}" stroke="${color}" stroke-width="1.9" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>`;

export const iconShare = (color = "#5B6B5A", size = 18) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><line x1="8.3" y1="10.7" x2="15.7" y2="6.3"/><line x1="8.3" y1="13.3" x2="15.7" y2="17.7"/></svg>`;

export const iconHome = (color = "#95A192", size = 21) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>`;

export const iconCompass = (color = "#95A192", size = 21) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`;

export const iconUser = (color = "#95A192", size = 21) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>`;

export const iconPlus = (color = "#FFFFFF", size = 22) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

export const iconUpload = (color = "#7C8A79", size = 20) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

export const iconInfo = (color = "#95A192", size = 13) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>`;

export const iconUndo = (color = "#1E2A1F", size = 17) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-6.7L3 9"/></svg>`;

export const iconPin = (color = "#FFFFFF", size = 17) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"><path d="M12 2v14"/><circle cx="12" cy="19" r="2.5"/></svg>`;

export const iconFile = (color = "#1E2A1F", size = 17) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/></svg>`;

export const iconPlay = (color = "#FFFFFF", size = 20) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}"><polygon points="7,5 20,12 7,19"/></svg>`;

// Waypoint type -> { icon(color,size), soft bg color, ink color, label }
export const WAYPOINT_TYPES = {
  REFUGIO: {
    label: "Refugio",
    soft: "var(--pine-soft)",
    ink: "var(--pine)",
    icon: (color, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>`,
  },
  AGUA: {
    label: "Agua",
    soft: "var(--water-soft)",
    ink: "var(--water)",
    icon: (color, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linejoin="round"><path d="M12 3C9 7 6 10.5 6 14a6 6 0 0012 0c0-3.5-3-7-6-11z"/></svg>`,
  },
  MIRADOR: {
    label: "Mirador",
    soft: "var(--surface-alt)",
    ink: "var(--ink-soft)",
    icon: (color, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
  },
  PELIGRO: {
    label: "Peligro",
    soft: "var(--accent-soft)",
    ink: "var(--danger)",
    icon: (color, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"><path d="M12 2L2 21h20L12 2z"/><line x1="12" y1="10" x2="12" y2="15"/><circle cx="12" cy="17.5" r="0.6" fill="${color}"/></svg>`,
  },
  CAMPAMENTO: {
    label: "Campamento",
    soft: "var(--surface-alt)",
    ink: "var(--ink-soft)",
    icon: (color, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linejoin="round"><path d="M4 21V10l8-6 8 6v11"/><path d="M4 21h16"/></svg>`,
  },
  TECNICA: {
    label: "Técnica",
    soft: "var(--surface-alt)",
    ink: "var(--ink-soft)",
    icon: (color, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-3 4 3 4H5"/></svg>`,
  },
};

export const DIFFICULTY_COLOR = {
  FACIL: "var(--pine)",
  MEDIA: "var(--amber)",
  DIFICIL: "var(--danger)",
};
export const DIFFICULTY_LABEL = { FACIL: "Fácil", MEDIA: "Media", DIFICIL: "Difícil" };
