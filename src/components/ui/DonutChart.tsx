const CHART_SIZE = 140
const CHART_RADIUS = 44
const CHART_STROKE = 10
const CHART_CIRCUMFERENCE = 2 * Math.PI * CHART_RADIUS

export interface DonutChartSegment {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  title: string
  subtitle: string
  segments: DonutChartSegment[]
  centerLabel: string
  centerValue: string
  emptyMessage: string
  formatValue?: (value: number) => string
}

function formatPercentage(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`
}

export default function DonutChart({
  title,
  subtitle,
  segments,
  centerLabel,
  centerValue,
  emptyMessage,
  formatValue = (value) =>
    value.toLocaleString('es-AR', {
      maximumFractionDigits: 2,
    }),
}: DonutChartProps) {
  const normalizedSegments = segments.filter((segment) => segment.value > 0)
  const total = normalizedSegments.reduce(
    (accumulator, segment) => accumulator + segment.value,
    0
  )

  let accumulatedLength = 0

  const chartSegments = normalizedSegments.map((segment) => {
    const segmentLength = (segment.value / total) * CHART_CIRCUMFERENCE
    const segmentOffset = accumulatedLength

    accumulatedLength += segmentLength

    return {
      ...segment,
      percentage: (segment.value / total) * 100,
      strokeDasharray: `${segmentLength} ${CHART_CIRCUMFERENCE - segmentLength}`,
      strokeDashoffset: -segmentOffset,
    }
  })

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="">
        <div className="flex justify-center">
          <div className="relative flex h-[240px] w-[240px] items-center justify-center">
            <svg
              viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
              className="h-[240px] w-[240px] -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx={CHART_SIZE / 2}
                cy={CHART_SIZE / 2}
                r={CHART_RADIUS}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={CHART_STROKE}
              />

              {chartSegments.map((segment) => (
                <circle
                  key={segment.label}
                  cx={CHART_SIZE / 2}
                  cy={CHART_SIZE / 2}
                  r={CHART_RADIUS}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={CHART_STROKE}
                  strokeLinecap="round"
                  strokeDasharray={segment.strokeDasharray}
                  strokeDashoffset={segment.strokeDashoffset}
                />
              ))}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {centerLabel}
              </span>
              <span className="mt-1 text-xl font-bold text-slate-800">
                {centerValue}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {chartSegments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              {emptyMessage}
            </div>
          ) : (
            chartSegments.map((segment) => (
              <div
                key={segment.label}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="font-medium text-slate-700">
                    {segment.label}
                  </span>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-slate-800">
                    {formatValue(segment.value)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatPercentage(segment.percentage)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
