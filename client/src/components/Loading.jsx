export default function Loading({ text = 'Loading' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg animate-spin" style={{ animationDuration: '1.5s' }}>
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 flex items-center justify-center">
            <span className="text-xs font-bold text-yellow-800">LKR</span>
          </div>
        </div>
      </div>
      <p className="text-gray-400 text-sm font-medium">{text}...</p>
    </div>
  );
}
