export default function HotelCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col animate-pulse">
      <div className="h-2 w-full bg-gray-200" />
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-center space-y-1.5">
              <div className="h-4 bg-gray-200 rounded mx-auto w-8" />
              <div className="h-2.5 bg-gray-100 rounded mx-auto w-10" />
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="h-5 bg-gray-200 rounded-full w-16" />
          <div className="h-5 bg-gray-100 rounded-full w-14" />
        </div>

        <div className="h-10 bg-gray-200 rounded-xl w-full" />
      </div>
    </div>
  );
}
