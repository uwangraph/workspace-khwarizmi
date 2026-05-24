import { writable } from 'svelte/store';

export type FontSizeKey = 'small' | 'medium' | 'large' | 'xlarge';

export type FontOption = {
  id: string;
  label: string;
  cssValue: string;
};

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'nunito',
    label: 'Nunito',
    cssValue: "'Nunito', 'Inter', sans-serif"
  },
  {
    id: 'plus-jakarta',
    label: 'Plus Jakarta Sans',
    cssValue: "'Plus Jakarta Sans', 'Inter', sans-serif"
  },
  {
    id: 'baloo',
    label: 'Baloo 2',
    cssValue: "'Baloo 2', 'Nunito', sans-serif"
  },
  {
    id: 'fredoka',
    label: 'Fredoka',
    cssValue: "'Fredoka', 'Nunito', sans-serif"
  },
  {
    id: 'quicksand',
    label: 'Quicksand',
    cssValue: "'Quicksand', 'Nunito', sans-serif"
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    cssValue: "'DM Sans', 'Inter', sans-serif"
  }
];

export const FONT_SIZE_OPTIONS: Array<{ id: FontSizeKey; label: string; px: number }> = [
  { id: 'small', label: 'Kecil', px: 15 },
  { id: 'medium', label: 'Normal', px: 16 },
  { id: 'large', label: 'Besar', px: 17 },
  { id: 'xlarge', label: 'Ekstra Besar', px: 18 }
];

export type AppearanceSettings = {
  fontFamilyId: string;
  fontSize: FontSizeKey;
};

const STORAGE_KEY = 'khwarizmi-appearance';
const defaultSettings: AppearanceSettings = {
  fontFamilyId: 'nunito',
  fontSize: 'medium'
};

function getFontSizePx(fontSize: FontSizeKey): number {
  return FONT_SIZE_OPTIONS.find((option) => option.id === fontSize)?.px ?? 16;
}

function getFontCssValue(fontFamilyId: string): string {
  return FONT_OPTIONS.find((option) => option.id === fontFamilyId)?.cssValue ?? FONT_OPTIONS[0].cssValue;
}

function applyAppearance(settings: AppearanceSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--app-font-family', getFontCssValue(settings.fontFamilyId));
  root.style.setProperty('--app-font-size-px', `${getFontSizePx(settings.fontSize)}px`);
}

function createAppearanceStore() {
  const { subscribe, set, update } = writable<AppearanceSettings>(defaultSettings);

  return {
    subscribe,
    init() {
      if (typeof window === 'undefined') return;
      let nextSettings = defaultSettings;

      try {
        const savedRaw = localStorage.getItem(STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw) as Partial<AppearanceSettings>;
          nextSettings = {
            fontFamilyId: FONT_OPTIONS.some((option) => option.id === saved.fontFamilyId)
              ? (saved.fontFamilyId as string)
              : defaultSettings.fontFamilyId,
            fontSize: FONT_SIZE_OPTIONS.some((option) => option.id === saved.fontSize)
              ? (saved.fontSize as FontSizeKey)
              : defaultSettings.fontSize
          };
        }
      } catch {
        nextSettings = defaultSettings;
      }

      applyAppearance(nextSettings);
      set(nextSettings);
    },
    setFontFamily(fontFamilyId: string) {
      update((current) => {
        const next = {
          ...current,
          fontFamilyId: FONT_OPTIONS.some((option) => option.id === fontFamilyId)
            ? fontFamilyId
            : current.fontFamilyId
        };
        applyAppearance(next);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
    },
    setFontSize(fontSize: FontSizeKey) {
      update((current) => {
        const next = {
          ...current,
          fontSize: FONT_SIZE_OPTIONS.some((option) => option.id === fontSize)
            ? fontSize
            : current.fontSize
        };
        applyAppearance(next);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
    },
    reset() {
      applyAppearance(defaultSettings);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
      }
      set(defaultSettings);
    }
  };
}

export const appearanceStore = createAppearanceStore();
