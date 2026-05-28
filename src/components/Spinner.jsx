export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-7 w-7', lg: 'h-12 w-12' };
  return <div className={`hst-spinner inline-block ${sizes[size]} ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Spinner size="lg" />
      <p className="text-slate-400 text-sm animate-pulse">Loading…</p>
    </div>
  );
}
