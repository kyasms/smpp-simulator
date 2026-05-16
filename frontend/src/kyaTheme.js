export const KYA = {
  light: {
    bg: '#FAFAF7',
    surface: '#FFFFFF',
    surfaceAlt: '#F2F1EB',
    ink: '#1A1A18',
    inkSoft: '#3a3a36',
    muted: '#79786F',
    mutedSoft: '#a8a69b',
    border: '#E5E3DA',
    borderSoft: '#EFEDE5',
    accent: 'oklch(0.52 0.10 150)',
    accentSoft: 'oklch(0.94 0.04 150)',
    danger: 'oklch(0.55 0.14 28)',
    dangerSoft: 'oklch(0.95 0.04 28)',
    warn: 'oklch(0.70 0.10 75)',
    success: 'oklch(0.52 0.10 150)',
  },
  dark: {
    bg: '#100F0E',
    surface: '#181715',
    surfaceAlt: '#1F1E1B',
    ink: '#EAE8DF',
    inkSoft: '#C9C7BD',
    muted: '#85847B',
    mutedSoft: '#5C5B53',
    border: '#2B2A26',
    borderSoft: '#23221F',
    accent: 'oklch(0.78 0.11 150)',
    accentSoft: 'oklch(0.30 0.05 150)',
    danger: 'oklch(0.72 0.14 28)',
    dangerSoft: 'oklch(0.30 0.06 28)',
    warn: 'oklch(0.78 0.11 75)',
    success: 'oklch(0.78 0.11 150)',
  },
};

export function resolveTheme(darkMode, monoFont) {
  const base = darkMode ? KYA.dark : KYA.light;
  const fontUI = monoFont
    ? "'Geist Mono', ui-monospace, Menlo, monospace"
    : "'Geist', system-ui, sans-serif";
  const fontDisplay = monoFont
    ? "'Geist Mono', ui-monospace, Menlo, monospace"
    : "'Segoe UI', system-ui, sans-serif";
  const fontMono = "'Geist Mono', ui-monospace, Menlo, monospace";
  return { ...base, fontUI, fontDisplay, fontMono };
}
