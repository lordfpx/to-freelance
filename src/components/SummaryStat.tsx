type Tone = 'amber' | 'cyan' | 'jade'

function SummaryStat({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const toneClasses = {
    amber: 'text-amber-200',
    cyan: 'text-cyan-200',
    jade: 'text-emerald-200',
  } as const

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-sm text-white/60">{label}</p>
      <p className={`text-2xl font-bold ${toneClasses[tone]}`}>{value}</p>
    </div>
  )
}

export default SummaryStat
