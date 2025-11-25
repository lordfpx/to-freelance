function InlineDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-white/80">
      <span className="text-sm">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  )
}

export default InlineDetail
