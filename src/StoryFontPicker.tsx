import { useEffect, useState } from 'react'

// TEMPORARY review tool (vite dev only): try fonts / weights / text colour for the expanded story text.
// Delete this file + its use in main.tsx once a choice is made.
const FONTS: Record<string, string> = {
  'Inter (current)': "'Inter', system-ui, sans-serif",
  'System (SF Pro)': "system-ui, -apple-system, 'Helvetica Neue', sans-serif",
  'Roboto': "'Roboto', sans-serif",
  'Source Sans 3': "'Source Sans 3', sans-serif",
  'IBM Plex Sans': "'IBM Plex Sans', sans-serif",
  'Open Sans': "'Open Sans', sans-serif",
  'Lato': "'Lato', sans-serif",
  'Merriweather (serif)': "'Merriweather', serif",
  'Georgia (serif)': "Georgia, 'Times New Roman', serif",
  'Verdana': "Verdana, Geneva, sans-serif",
  'JetBrains Mono': "'JetBrains Mono', monospace",
}
// [dark mode, light mode]; '' = use the theme's own --text-secondary. CSS picks the one matching :root.light.
const COLORS: Record<string, [string, string]> = {
  'Current (dim grey)': ['', ''],
  'Brighter': ['#c4c8dc', '#3a3f55'],
  'Near white / near black': ['#f0f2f8', '#14161f'],
}
const WEIGHTS = ['400', '500', '600', '700']
const KEY = 'jcnews.storyFontPick'

export default function StoryFontPicker() {
  const [pick, setPick] = useState(() => {
    try { return { font: 'JetBrains Mono', color: 'Near white / near black', weight: '700', ...JSON.parse(localStorage.getItem(KEY) || '{}') } }
    catch { return { font: 'JetBrains Mono', color: 'Near white / near black', weight: '700' } }
  })
  useEffect(() => {
    const s = document.documentElement.style
    s.setProperty('--story-font', FONTS[pick.font] || FONTS['Inter (current)'])
    const [dark, light] = COLORS[pick.color] || COLORS['Current (dim grey)']
    if (dark) s.setProperty('--story-color-dark', dark); else s.removeProperty('--story-color-dark')
    if (light) s.setProperty('--story-color-light', light); else s.removeProperty('--story-color-light')
    s.setProperty('--story-weight', pick.weight)
    try { localStorage.setItem(KEY, JSON.stringify(pick)) } catch { /* ignore */ }
  }, [pick])
  const sel = (label: string, key: 'font' | 'color' | 'weight', opts: string[]) => (
    <label style={{ display: 'block', marginBottom: 4 }}>
      {label}{' '}
      <select value={pick[key]} onChange={e => setPick({ ...pick, [key]: e.target.value })}>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </label>
  )
  return (
    <div style={{ position: 'fixed', bottom: 8, left: 8, zIndex: 9999, background: '#181b25', color: '#f0f2f8',
      border: '1px solid #6366f1', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Story text (dev)</div>
      {sel('Font', 'font', Object.keys(FONTS))}
      {sel('Weight', 'weight', WEIGHTS)}
      {sel('Colour', 'color', Object.keys(COLORS))}
    </div>
  )
}
