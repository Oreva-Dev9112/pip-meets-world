// Little hand-drawn icons for the toy tray and controls, in the map's ink-and-colour style.

const svg = (body: string): string =>
  `<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true" fill="none" stroke="#1F3340" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICONS = {
  berry: svg('<path d="M16 9c-1-3 1-5 4-5-1 2-2 4-4 5z" fill="#86B87F"/><circle cx="11" cy="18" r="5" fill="#D94F5C"/><circle cx="20" cy="17" r="5" fill="#D94F5C"/><circle cx="16" cy="24" r="5" fill="#D94F5C"/><path d="M16 9v4"/>'),
  ball: svg('<circle cx="16" cy="16" r="10" fill="#FBFBF6"/><path d="M6.5 13c4 2 15 2 19 0M8 22c4-2 12-2 16 0" stroke="#D94F5C" stroke-width="2.5"/><circle cx="16" cy="16" r="10"/>'),
  hat: svg('<path d="M10 21V9h12v12" fill="#9B8CFF"/><path d="M10 17h12" stroke="#F2A93B" stroke-width="3"/><path d="M5 22h22" stroke-width="3"/><path d="M10 21V9h12v12"/>'),
  umbrella: svg('<path d="M4 16a12 10 0 0 1 24 0c-2-2-4-2-6 0-2-2-4-2-6 0-2-2-4-2-6 0-2-2-4-2-6 0z" fill="#6C9CF2"/><path d="M16 16v9a2.5 2.5 0 0 1-5 0"/><path d="M16 4v2"/>'),
  kite: svg('<path d="M16 3l8 10-8 10-8-10z" fill="#FF8A80"/><path d="M16 3v20M8 13h16"/><path d="M16 23c-2 2 1 3-1 5M13 26l2 1M16 29l2-1" stroke-width="1.5"/>'),
  flower: svg('<path d="M16 19v10M16 25c3 0 5-2 5-4-3 0-5 2-5 4z" fill="#86B87F"/><circle cx="16" cy="8" r="4" fill="#F7D774"/><circle cx="10" cy="13" r="4" fill="#F7D774"/><circle cx="22" cy="13" r="4" fill="#F7D774"/><circle cx="12" cy="19" r="3.5" fill="#F7D774"/><circle cx="20" cy="19" r="3.5" fill="#F7D774"/><circle cx="16" cy="14" r="3.5" fill="#F2A93B"/>'),
  rain: svg('<path d="M9 18a5 5 0 0 1 1-10 7 7 0 0 1 13 2 4 4 0 0 1 0 8z" fill="#E4ECEC"/><path d="M11 22l-1.5 4M17 22l-1.5 4M23 22l-1.5 4" stroke="#6C9CF2" stroke-width="2.5"/>'),
  wind: svg('<path d="M4 12h15a4 4 0 1 0-4-4M4 18h20a3.5 3.5 0 1 1-3.5 3.5M4 24h9"/>'),
  pause: svg('<rect x="9" y="7" width="5" height="18" rx="1.5" fill="#FBFBF6"/><rect x="18" y="7" width="5" height="18" rx="1.5" fill="#FBFBF6"/>'),
  play: svg('<path d="M10 6l15 10-15 10z" fill="#FBFBF6"/>'),
  tomorrow: svg('<path d="M4 23h24"/><path d="M9 23a7 7 0 0 1 14 0" fill="#F7D774"/><path d="M16 8v3M8 12l2 2M24 12l-2 2M4 18h2M26 18h2"/>'),
  soundOn: svg('<path d="M5 12h5l6-5v18l-6-5H5z" fill="#FBFBF6"/><path d="M21 12a5 5 0 0 1 0 8M24 9a9 9 0 0 1 0 14"/>'),
  soundOff: svg('<path d="M5 12h5l6-5v18l-6-5H5z" fill="#FBFBF6"/><path d="M21 13l6 6M27 13l-6 6"/>'),
  find: svg('<circle cx="16" cy="16" r="9"/><circle cx="16" cy="16" r="3.5" fill="#F7D774"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4"/>'),
  plus: svg('<path d="M16 8v16M8 16h16" stroke-width="2.5"/>'),
  minus: svg('<path d="M8 16h16" stroke-width="2.5"/>'),
  moon: svg('<path d="M21 5a11 11 0 1 0 6 16A9 9 0 0 1 21 5z" fill="#F7D774"/>'),
  tower: svg('<rect x="11" y="9" width="10" height="19" fill="#C3CBCD"/><rect x="9" y="5" width="14" height="5" fill="#AEB8BC"/><rect x="14.5" y="14" width="3" height="5" fill="#1F3340"/>'),
} as const;

export type IconName = keyof typeof ICONS;

/** Puts an icon in a button, with an optional visible label, keeping the name for screen readers. */
export function setIcon(b: HTMLElement, icon: IconName, label: string, text = ''): void {
  b.innerHTML = ICONS[icon] + (text ? `<span>${text}</span>` : '');
  b.setAttribute('aria-label', label);
  b.title = label;
}
