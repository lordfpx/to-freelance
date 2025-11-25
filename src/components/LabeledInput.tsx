type Props = {
  label: string
  value: string | number
  onChange?: (value: string) => void
  suffix?: string
  readOnly?: boolean
}

function LabeledInput({ label, value, onChange, suffix, readOnly = false }: Props) {
  const inputClasses =
    'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-70'

  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-white">{label}</span>
      <div className="relative">
        <input
          value={value}
          inputMode="decimal"
          readOnly={readOnly}
          onChange={readOnly || !onChange ? undefined : (event) => onChange(event.target.value)}
          className={`${inputClasses} ${suffix ? 'pr-12' : ''}`}
          placeholder="0"
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-white/60">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}

export default LabeledInput
