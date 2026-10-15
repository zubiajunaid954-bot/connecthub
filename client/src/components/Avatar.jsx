const COLORS = ['bg-indigo-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-fuchsia-500', 'bg-teal-500'];

const hash = (str) => [...str].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);

export default function Avatar({ name = '?', size = 'md' }) {
  const sizes = { sm: 'h-6 w-6 text-xs', md: 'h-8 w-8 text-sm', lg: 'h-16 w-16 text-2xl' };
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold uppercase text-white ${COLORS[hash(name) % COLORS.length]} ${sizes[size]}`}
      aria-hidden="true"
    >
      {name.charAt(0)}
    </span>
  );
}
