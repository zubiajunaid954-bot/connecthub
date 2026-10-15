// Keep in sync with server/src/config/constants.js
export const CATEGORIES = [
  { slug: 'general', label: 'General', color: 'bg-slate-100 text-slate-700' },
  { slug: 'javascript', label: 'JavaScript', color: 'bg-yellow-100 text-yellow-800' },
  { slug: 'react', label: 'React', color: 'bg-sky-100 text-sky-800' },
  { slug: 'node', label: 'Node.js', color: 'bg-green-100 text-green-800' },
  { slug: 'databases', label: 'Databases', color: 'bg-emerald-100 text-emerald-800' },
  { slug: 'career', label: 'Career', color: 'bg-purple-100 text-purple-800' },
  { slug: 'showcase', label: 'Showcase', color: 'bg-pink-100 text-pink-800' },
];

export const categoryOf = (slug) => CATEGORIES.find((c) => c.slug === slug) || CATEGORIES[0];

export const SORT_OPTIONS = [
  { value: 'new', label: 'Newest' },
  { value: 'top', label: 'Top voted' },
  { value: 'discussed', label: 'Most discussed' },
];
