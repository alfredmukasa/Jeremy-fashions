/** Public brand marks — served from `/public/brand`. */
export const BRAND_LOGO = {
  /** Black mark for light backgrounds */
  dark: '/brand/logo-dark.jpeg',
  /** Light mark for dark backgrounds (falls back to inverted dark via CSS when identical) */
  light: '/brand/logo-light.jpeg',
  /** Natural aspect ratio of source assets (~square mark) */
  aspectRatio: 1,
} as const
