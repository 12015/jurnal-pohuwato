interface PlaceholderPageProps {
  icon?: string;
  title: string;
  description: string;
}

export function PlaceholderPage({
  icon = '🚧',
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4 text-3xl">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}