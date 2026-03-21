interface Props {
  rate: number;
  occupied: number;
  total: number;
}

export default function OccupancyGauge({ rate, occupied, total }: Props) {
  const clamp = Math.min(100, Math.max(0, rate));
  const radius = 54;
  const circumference = Math.PI * radius;
  const offset = circumference - (clamp / 100) * circumference;

  const color = clamp >= 80 ? '#10b981' : clamp >= 50 ? '#2563eb' : clamp >= 30 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="relative w-44 h-24">
        <svg viewBox="0 0 120 64" className="w-full h-full overflow-visible">
          <path
            d="M 10 60 A 54 54 0 0 1 110 60"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M 10 60 A 54 54 0 0 1 110 60"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-3xl font-bold text-gray-900 leading-none" style={{ color }}>{clamp}%</span>
          <span className="text-xs text-gray-500 mt-1">{occupied} / {total} rooms</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1">Current Occupancy</p>
    </div>
  );
}
