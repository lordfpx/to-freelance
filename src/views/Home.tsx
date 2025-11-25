import { useEffect, useMemo, useState } from 'react'
import { atom, useAtom } from 'jotai'
import { nanoid } from 'nanoid'

// Inputs
const tjmAtom = atom(650)
const daysWorkedAtom = atom(180)
const monthlyNetSalaryAtom = atom(3800)
const monthlyIncomeTaxRateAtom = atom(0.11)

// Charges (deductibles before IS)
type DeductibleCharge = {
  id: string
  label: string
  amount: number
}

type SimulationData = {
  tjm: number
  daysWorked: number
  monthlyNetSalary: number
  monthlyIncomeTaxRate: number
  deductibleCharges: DeductibleCharge[]
  corporateTaxReducedRate: number
  corporateTaxNormalRate: number
  corporateTaxThreshold: number
  dividendFlatTaxRate: number
}

type Simulation = {
  id: string
  name: string
  data: SimulationData
  updatedAt: number
}

const SIMULATIONS_KEY = 'sasu-simulations'
const ACTIVE_SIMULATION_KEY = 'sasu-active-simulation-id'
// Coefficients moyens 2025 pour un président assimilé salarié (charges hors cas particuliers)
const EMPLOYEE_CONTRIB_RATE = 0.225 // charges salariales ~22,5 %
const EMPLOYER_CONTRIB_RATE = 0.433 // charges patronales ~43,3 %
const DEFAULT_SIMULATION_DATA: SimulationData = {
  tjm: 650,
  daysWorked: 180,
  monthlyNetSalary: 3800,
  monthlyIncomeTaxRate: 0.11,
  deductibleCharges: [
    { id: nanoid(), label: 'Logiciels et abonnements', amount: 1800 },
    { id: nanoid(), label: 'Matériel et amortissements', amount: 2200 },
    { id: nanoid(), label: 'Frais de déplacement', amount: 1200 },
  ],
  corporateTaxReducedRate: 0.15,
  corporateTaxNormalRate: 0.25,
  corporateTaxThreshold: 42500,
  dividendFlatTaxRate: 0.3,
}

const deductibleChargesAtom = atom<DeductibleCharge[]>(DEFAULT_SIMULATION_DATA.deductibleCharges)

// Assumptions for a SASU with président assimilé salarié
const corporateTaxReducedRateAtom = atom(0.15)
const corporateTaxNormalRateAtom = atom(0.25)
const corporateTaxThresholdAtom = atom(42500)
const dividendFlatTaxRateAtom = atom(0.3)

// Derived values
const annualTurnoverAtom = atom((get) => get(tjmAtom) * get(daysWorkedAtom))

const annualNetSalaryAtom = atom((get) => get(monthlyNetSalaryAtom) * 12)

const annualGrossSalaryAtom = atom((get) => {
  const net = get(annualNetSalaryAtom)
  return net / (1 - EMPLOYEE_CONTRIB_RATE)
})

const annualEmployerContribAtom = atom((get) => get(annualGrossSalaryAtom) * EMPLOYER_CONTRIB_RATE)

const totalPayrollCostAtom = atom((get) => get(annualGrossSalaryAtom) + get(annualEmployerContribAtom))

const totalDeductiblesAtom = atom((get) => get(deductibleChargesAtom).reduce((sum, item) => sum + item.amount, 0))

const resultBeforeTaxAtom = atom((get) => get(annualTurnoverAtom) - get(totalPayrollCostAtom) - get(totalDeductiblesAtom))

const corporateTaxAtom = atom((get) => {
  const taxable = Math.max(0, get(resultBeforeTaxAtom))
  const threshold = get(corporateTaxThresholdAtom)
  const reducedRate = get(corporateTaxReducedRateAtom)
  const normalRate = get(corporateTaxNormalRateAtom)

  const reducedBase = Math.min(taxable, threshold)
  const normalBase = Math.max(0, taxable - threshold)

  return reducedBase * reducedRate + normalBase * normalRate
})

const distributableResultAtom = atom((get) => get(resultBeforeTaxAtom) - get(corporateTaxAtom))

const netDividendsAtom = atom((get) => Math.max(0, get(distributableResultAtom) * (1 - get(dividendFlatTaxRateAtom))))

const netSalaryAfterWithholdingAtom = atom((get) => {
  const annualNet = get(annualNetSalaryAtom)
  const rate = get(monthlyIncomeTaxRateAtom)
  return annualNet * (1 - rate)
})

const totalTakeHomeAtom = atom((get) => get(netSalaryAfterWithholdingAtom) + get(netDividendsAtom))

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const cardClass =
  'rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 shadow-xl shadow-black/20 backdrop-blur transition'
const sectionTitleClass = 'text-xl font-semibold text-white'
const helperTextClass = 'text-sm text-white/70'

function areSimulationDataEqual(a: SimulationData, b: SimulationData) {
  if (
    a.tjm !== b.tjm ||
    a.daysWorked !== b.daysWorked ||
    a.monthlyNetSalary !== b.monthlyNetSalary ||
    a.monthlyIncomeTaxRate !== b.monthlyIncomeTaxRate ||
    a.corporateTaxReducedRate !== b.corporateTaxReducedRate ||
    a.corporateTaxNormalRate !== b.corporateTaxNormalRate ||
    a.corporateTaxThreshold !== b.corporateTaxThreshold ||
    a.dividendFlatTaxRate !== b.dividendFlatTaxRate ||
    a.deductibleCharges.length !== b.deductibleCharges.length
  ) {
    return false
  }

  return a.deductibleCharges.every((charge, index) => {
    const other = b.deductibleCharges[index]
    return other && other.id === charge.id && other.label === charge.label && other.amount === charge.amount
  })
}

function withDefaultSimulationData(data?: Partial<SimulationData>): SimulationData {
  if (!data) return DEFAULT_SIMULATION_DATA
  return {
    tjm: data.tjm ?? DEFAULT_SIMULATION_DATA.tjm,
    daysWorked: data.daysWorked ?? DEFAULT_SIMULATION_DATA.daysWorked,
    monthlyNetSalary: data.monthlyNetSalary ?? DEFAULT_SIMULATION_DATA.monthlyNetSalary,
    monthlyIncomeTaxRate: data.monthlyIncomeTaxRate ?? DEFAULT_SIMULATION_DATA.monthlyIncomeTaxRate,
    deductibleCharges: data.deductibleCharges?.length
      ? data.deductibleCharges
      : DEFAULT_SIMULATION_DATA.deductibleCharges,
    corporateTaxReducedRate: data.corporateTaxReducedRate ?? DEFAULT_SIMULATION_DATA.corporateTaxReducedRate,
    corporateTaxNormalRate: data.corporateTaxNormalRate ?? DEFAULT_SIMULATION_DATA.corporateTaxNormalRate,
    corporateTaxThreshold: data.corporateTaxThreshold ?? DEFAULT_SIMULATION_DATA.corporateTaxThreshold,
    dividendFlatTaxRate: data.dividendFlatTaxRate ?? DEFAULT_SIMULATION_DATA.dividendFlatTaxRate,
  }
}

function readSimulationsFromStorage(): { simulations: Simulation[]; activeId?: string } {
  if (typeof window === 'undefined') return { simulations: [] }

  const raw = localStorage.getItem(SIMULATIONS_KEY)
  const activeId = localStorage.getItem(ACTIVE_SIMULATION_KEY) || undefined

  if (!raw) return { simulations: [], activeId }

  try {
    const parsed = JSON.parse(raw) as Simulation[]
    if (Array.isArray(parsed)) {
      const normalized = parsed.map((sim) => ({
        ...sim,
        data: withDefaultSimulationData(sim.data),
      }))
      return { simulations: normalized, activeId }
    }
  } catch (error) {
    console.error('Impossible de lire les simulations sauvegardées', error)
  }

  return { simulations: [], activeId }
}

function persistSimulations(simulations: Simulation[], activeId: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SIMULATIONS_KEY, JSON.stringify(simulations))
  localStorage.setItem(ACTIVE_SIMULATION_KEY, activeId)
}

function formatRate(value: number) {
  return `${(value * 100).toFixed(1)} %`
}

function parseLocaleDecimal(value: string) {
  return Number(value.replace(',', '.'))
}

function Home() {
  const [tjm, setTjm] = useAtom(tjmAtom)
  const [daysWorked, setDaysWorked] = useAtom(daysWorkedAtom)
  const [monthlyNetSalary, setMonthlyNetSalary] = useAtom(monthlyNetSalaryAtom)
  const [monthlyTaxRate, setMonthlyTaxRate] = useAtom(monthlyIncomeTaxRateAtom)
  const [deductibleCharges, setDeductibleCharges] = useAtom(deductibleChargesAtom)
  const [corporateTaxReducedRate, setCorporateTaxReducedRate] = useAtom(corporateTaxReducedRateAtom)
  const [corporateTaxNormalRate, setCorporateTaxNormalRate] = useAtom(corporateTaxNormalRateAtom)
  const [corporateTaxThreshold, setCorporateTaxThreshold] = useAtom(corporateTaxThresholdAtom)
  const [dividendFlatTaxRate, setDividendFlatTaxRate] = useAtom(dividendFlatTaxRateAtom)

  const annualTurnover = useAtom(annualTurnoverAtom)[0]
  const annualNetSalary = useAtom(annualNetSalaryAtom)[0]
  const annualGrossSalary = useAtom(annualGrossSalaryAtom)[0]
  const annualEmployerContrib = useAtom(annualEmployerContribAtom)[0]
  const totalPayrollCost = useAtom(totalPayrollCostAtom)[0]
  const totalDeductibles = useAtom(totalDeductiblesAtom)[0]
  const resultBeforeTax = useAtom(resultBeforeTaxAtom)[0]
  const corporateTax = useAtom(corporateTaxAtom)[0]
  const distributableResult = useAtom(distributableResultAtom)[0]
  const netDividends = useAtom(netDividendsAtom)[0]
  const netSalaryAfterWithholding = useAtom(netSalaryAfterWithholdingAtom)[0]
  const totalTakeHome = useAtom(totalTakeHomeAtom)[0]

  const currentData = useMemo(
    () => ({
      tjm,
      daysWorked,
      monthlyNetSalary,
      monthlyIncomeTaxRate: monthlyTaxRate,
      deductibleCharges,
      corporateTaxReducedRate,
      corporateTaxNormalRate,
      corporateTaxThreshold,
      dividendFlatTaxRate,
    }),
    [
      corporateTaxNormalRate,
      corporateTaxReducedRate,
      corporateTaxThreshold,
      daysWorked,
      deductibleCharges,
      dividendFlatTaxRate,
      monthlyNetSalary,
      monthlyTaxRate,
      tjm,
    ],
  )

  const [initialSimulationState] = useState(() => {
    const { simulations: storedSimulations, activeId } = readSimulationsFromStorage()
    const fallbackData = withDefaultSimulationData(currentData)
    const simulations =
      storedSimulations.length > 0
        ? storedSimulations
        : [
            {
              id: nanoid(),
              name: 'Simulation 1',
              data: fallbackData,
              updatedAt: Date.now(),
            },
          ]
    const activeSimulationId =
      (activeId && simulations.find((sim) => sim.id === activeId)?.id) || simulations[0].id

    return { simulations, activeSimulationId }
  })

  const [simulations, setSimulations] = useState<Simulation[]>(initialSimulationState.simulations)
  const [activeSimulationId, setActiveSimulationId] = useState<string>(initialSimulationState.activeSimulationId)
  const [hasHydrated, setHasHydrated] = useState(false)

  const activeSimulation = simulations.find((sim) => sim.id === activeSimulationId)

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    [],
  )

  const applySimulationData = (data: SimulationData) => {
    const normalized = withDefaultSimulationData(data)
    setTjm(normalized.tjm)
    setDaysWorked(normalized.daysWorked)
    setMonthlyNetSalary(normalized.monthlyNetSalary)
    setMonthlyTaxRate(normalized.monthlyIncomeTaxRate)
    setDeductibleCharges(normalized.deductibleCharges)
    setCorporateTaxReducedRate(normalized.corporateTaxReducedRate)
    setCorporateTaxNormalRate(normalized.corporateTaxNormalRate)
    setCorporateTaxThreshold(normalized.corporateTaxThreshold)
    setDividendFlatTaxRate(normalized.dividendFlatTaxRate)
  }

  useEffect(() => {
    if (!activeSimulation) return
    applySimulationData(activeSimulation.data)
    setHasHydrated(true)
  }, [activeSimulationId])

  useEffect(() => {
    if (!hasHydrated || !activeSimulation) return

    setSimulations((previous) => {
      const index = previous.findIndex((sim) => sim.id === activeSimulationId)
      if (index === -1) return previous

      const existing = previous[index]
      if (areSimulationDataEqual(existing.data, currentData)) {
        return previous
      }

      const updatedSimulation: Simulation = {
        ...existing,
        data: currentData,
        updatedAt: Date.now(),
      }

      const nextSimulations = [...previous]
      nextSimulations[index] = updatedSimulation
      return nextSimulations
    })
  }, [activeSimulation, activeSimulationId, currentData, hasHydrated])

  useEffect(() => {
    persistSimulations(simulations, activeSimulationId)
  }, [activeSimulationId, simulations])

  const updateCharge = (id: string, key: 'label' | 'amount', value: string) => {
    setDeductibleCharges((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: key === 'amount' ? Number(value) || 0 : value,
            }
          : item,
      ),
    )
  }

  const addCharge = () => {
    setDeductibleCharges((prev) => [...prev, { id: nanoid(), label: 'Nouvelle charge', amount: 0 }])
  }

  const removeCharge = (id: string) => {
    setDeductibleCharges((prev) => prev.filter((item) => item.id !== id))
  }

  const promptSimulationName = (defaultName: string) => {
    const name = window.prompt('Nom de la simulation', defaultName)
    return name?.trim()
  }

  const handleCreateSimulation = () => {
    const defaultName = `Simulation ${simulations.length + 1}`
    const name = promptSimulationName(defaultName)
    if (!name) return

    const newSimulation: Simulation = {
      id: nanoid(),
      name,
      data: currentData,
      updatedAt: Date.now(),
    }

    setSimulations((prev) => [...prev, newSimulation])
    setActiveSimulationId(newSimulation.id)
  }

  const handleSelectSimulation = (id: string) => {
    if (id === activeSimulationId) return
    const simulationToLoad = simulations.find((sim) => sim.id === id)
    if (!simulationToLoad) return

    applySimulationData(simulationToLoad.data)
    setActiveSimulationId(id)
  }

  const handleRenameSimulation = (id: string) => {
    const simulationToRename = simulations.find((sim) => sim.id === id)
    if (!simulationToRename) return

    const name = promptSimulationName(simulationToRename.name)
    if (!name || name === simulationToRename.name) return

    setSimulations((prev) =>
      prev.map((sim) => (sim.id === id ? { ...sim, name, updatedAt: Date.now() } : sim)),
    )
  }

  const handleDeleteSimulation = (id: string) => {
    const simulationToDelete = simulations.find((sim) => sim.id === id)
    if (!simulationToDelete) return

    const confirmed = window.confirm(`Supprimer "${simulationToDelete.name}" ?`)
    if (!confirmed) return

    const remaining = simulations.filter((sim) => sim.id !== id)
    if (remaining.length === 0) {
      const fallback: Simulation = {
        id: nanoid(),
        name: 'Simulation 1',
        data: currentData,
        updatedAt: Date.now(),
      }
      setSimulations([fallback])
      setActiveSimulationId(fallback.id)
      return
    }

    const nextActiveId = activeSimulationId === id ? remaining[0].id : activeSimulationId
    if (nextActiveId !== activeSimulationId) {
      const nextSimulation = remaining.find((sim) => sim.id === nextActiveId)
      if (nextSimulation) {
        applySimulationData(nextSimulation.data)
      }
    }

    setSimulations(remaining)
    setActiveSimulationId(nextActiveId)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className={sectionTitleClass}>Simulations sauvegardées</h2>
            <p className={helperTextClass}>
              Données enregistrées automatiquement dans ce navigateur. Ouvrez, renommez ou supprimez une simulation.
            </p>
          </div>
          <button
            onClick={handleCreateSimulation}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-0"
          >
            Nouvelle simulation
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {simulations.map((simulation) => {
            const isActive = simulation.id === activeSimulationId
            return (
              <div
                key={simulation.id}
                className={`rounded-xl border px-4 py-3 transition ${
                  isActive ? 'border-cyan-500/70 bg-cyan-500/10' : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-base font-semibold ${isActive ? 'text-cyan-300' : 'text-white'}`}>
                        {simulation.name}
                      </p>
                      {isActive && (
                        <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                          active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/60">
                      Mise à jour : {dateFormatter.format(new Date(simulation.updatedAt))}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!isActive && (
                      <button
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400 hover:bg-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-0"
                        onClick={() => handleSelectSimulation(simulation.id)}
                      >
                        Ouvrir
                      </button>
                    )}
                    <button
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-0"
                      onClick={() => handleRenameSimulation(simulation.id)}
                    >
                      Renommer
                    </button>
                    <button
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-0"
                      onClick={() => handleDeleteSimulation(simulation.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass}>
          <div className="flex flex-col gap-3">
            <h3 className={sectionTitleClass}>Données activité</h3>
            <LabeledInput label="TJM HT (€)" value={tjm} onChange={(value) => setTjm(Number(value) || 0)} />
            <LabeledInput
              label="Jours facturés dans l'année"
              value={daysWorked}
              onChange={(value) => setDaysWorked(Number(value) || 0)}
            />
            <p className={helperTextClass}>
              Chiffre d'affaires annuel estimé : {currencyFormatter.format(annualTurnover)} HT
            </p>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex flex-col gap-3">
            <h3 className={sectionTitleClass}>Rémunération salariale</h3>
            <LabeledInput
              label="Salaire net mensuel visé (€)"
              value={monthlyNetSalary}
              onChange={(value) => setMonthlyNetSalary(Number(value) || 0)}
            />
            <LabeledInput
              label="Taux de prélèvement à la source mensuel"
              suffix="%"
              value={(monthlyTaxRate * 100).toFixed(1).replace('.', ',')}
              onChange={(value) => setMonthlyTaxRate((parseLocaleDecimal(value) || 0) / 100)}
            />
            <div className="my-2 h-px w-full bg-white/10" />
            <div className="flex flex-col gap-2 text-sm text-white/80">
              <InlineDetail label="Net annuel" value={currencyFormatter.format(annualNetSalary)} />
              <InlineDetail label="Salaire brut annuel" value={currencyFormatter.format(annualGrossSalary)} />
              <InlineDetail label="Charges patronales" value={currencyFormatter.format(annualEmployerContrib)} />
              <InlineDetail label="Coût total de la rémunération" value={currencyFormatter.format(totalPayrollCost)} />
              <InlineDetail label="Net après PAS" value={currencyFormatter.format(netSalaryAfterWithholding)} />
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className={sectionTitleClass}>Charges déductibles</h3>
              <button
                onClick={addCharge}
                className="rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400 hover:bg-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-0"
              >
                Ajouter
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {deductibleCharges.map((charge) => (
                <div key={charge.id} className="flex flex-col gap-2 rounded-lg border border-white/5 bg-white/5 p-3">
                  <input
                    value={charge.label}
                    onChange={(event) => updateCharge(charge.id, 'label', event.target.value)}
                    placeholder="Nom de la charge"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      value={charge.amount || ''}
                      inputMode="decimal"
                      onChange={(event) => updateCharge(charge.id, 'amount', event.target.value)}
                      className="w-32 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                      placeholder="€"
                    />
                    <button
                      className="ml-auto rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-0"
                      onClick={() => removeCharge(charge.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
              {deductibleCharges.length === 0 && (
                <p className={helperTextClass}>Ajoutez vos charges (logiciels, déplacements, matériel…).</p>
              )}
            </div>
            <InlineDetail label="Total charges" value={currencyFormatter.format(totalDeductibles)} />
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex flex-col gap-3">
            <h3 className={sectionTitleClass}>Hypothèses SASU</h3>
            <InlineDetail label="Part salariale (net → brut)" value={formatRate(EMPLOYEE_CONTRIB_RATE)} />
            <InlineDetail label="Charges patronales" value={formatRate(EMPLOYER_CONTRIB_RATE)} />
            <LabeledInput
              label="IS réduit (0€ → 42 500€)"
              suffix="%"
              value={(corporateTaxReducedRate * 100).toFixed(1)}
              readOnly
            />
            <LabeledInput
              label="IS normal (> 42 500€)"
              suffix="%"
              value={(corporateTaxNormalRate * 100).toFixed(1)}
              readOnly
            />
            <p className={helperTextClass}>
              Les taux d&apos;IS sont appliqués automatiquement et ne peuvent pas être modifiés.
            </p>
            <LabeledInput
              label="Seuil IS réduit (€)"
              value={corporateTaxThreshold}
              onChange={(value) => setCorporateTaxThreshold(Number(value) || 0)}
            />
            <LabeledInput
              label="PFU dividendes"
              suffix="%"
              value={(dividendFlatTaxRate * 100).toFixed(1)}
              onChange={(value) => setDividendFlatTaxRate((Number(value) || 0) / 100)}
            />
            <p className={helperTextClass}>
              Taux moyens en vigueur appliqués automatiquement (hors exonérations, ACRE, AT/MP spécifique, mutuelle…).
            </p>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex flex-col gap-3">
          <h3 className="text-2xl font-semibold text-white">Résultats annuels</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryStat label="Résultat avant IS" value={currencyFormatter.format(resultBeforeTax)} tone="amber" />
            <SummaryStat label="IS dû" value={currencyFormatter.format(corporateTax)} tone="amber" />
            <SummaryStat
              label="Résultat distribuable"
              value={currencyFormatter.format(distributableResult)}
              tone="cyan"
            />
            <SummaryStat label="Dividendes nets (PFU)" value={currencyFormatter.format(netDividends)} tone="cyan" />
            <SummaryStat label="Revenu net total" value={currencyFormatter.format(totalTakeHome)} tone="jade" />
          </div>
          <p className={helperTextClass}>
            Le revenu net total additionne la rémunération nette après prélèvement à la source et les dividendes après
            PFU (30 % par défaut). Les montants sont exprimés en euros et arrondis à l&apos;unité.
          </p>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex flex-col gap-3">
          <h3 className={sectionTitleClass}>Notes méthodologiques</h3>
          <textarea
            readOnly
            className="min-h-[220px] w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            value={`Hypothèses simplifiées pour une SASU avec président assimilé salarié :\n\n- Charges sociales : ${formatRate(
              EMPLOYEE_CONTRIB_RATE,
            )} salariales (net -> brut) et ${formatRate(EMPLOYER_CONTRIB_RATE)} patronales (taux moyens, hors exonérations spécifiques).\n- IS : ${formatRate(
              corporateTaxReducedRate,
            )} de 0€ à ${corporateTaxThreshold.toLocaleString('fr-FR', {
              maximumFractionDigits: 0,
            })} puis ${formatRate(
              corporateTaxNormalRate,
            )} au-delà.\n- Dividendes : soumis au PFU de ${formatRate(
              dividendFlatTaxRate,
            )} (12,8% IR + 17,2% prélèvements sociaux) sans abattement.\n- Le calcul exclut la TVA et les éventuels acomptes/provisions (URSSAF, IS).\n- Ajustez les taux si vous bénéficiez de dispositifs spécifiques (ACRE, taux réduit d'IS, exonérations locales).`}
          />
        </div>
      </div>
    </div>
  )
}

function LabeledInput({
  label,
  value,
  onChange,
  suffix,
  readOnly = false,
}: {
  label: string
  value: string | number
  onChange?: (value: string) => void
  suffix?: string
  readOnly?: boolean
}) {
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

function SummaryStat({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'cyan' | 'jade' }) {
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

function InlineDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-white/80">
      <span className="text-sm">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  )
}

export default Home
