import { useEffect, useMemo, useState } from 'react'
import { useAtom } from 'jotai'
import { atom } from 'jotai'
import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Inset,
  Separator,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes'
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
  employeeContribRate: number
  employerContribRate: number
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
  employeeContribRate: 0.22,
  employerContribRate: 0.45,
  corporateTaxReducedRate: 0.15,
  corporateTaxNormalRate: 0.25,
  corporateTaxThreshold: 42500,
  dividendFlatTaxRate: 0.3,
}

const deductibleChargesAtom = atom<DeductibleCharge[]>(DEFAULT_SIMULATION_DATA.deductibleCharges)

// Assumptions for a SASU with président assimilé salarié
const employeeContribRateAtom = atom(0.22) // net -> gross uplift
const employerContribRateAtom = atom(0.45)
const corporateTaxReducedRateAtom = atom(0.15)
const corporateTaxNormalRateAtom = atom(0.25)
const corporateTaxThresholdAtom = atom(42500)
const dividendFlatTaxRateAtom = atom(0.3)

// Derived values
const annualTurnoverAtom = atom((get) => get(tjmAtom) * get(daysWorkedAtom))

const annualNetSalaryAtom = atom((get) => get(monthlyNetSalaryAtom) * 12)

const annualGrossSalaryAtom = atom((get) => {
  const net = get(annualNetSalaryAtom)
  const employeeRate = get(employeeContribRateAtom)
  return net / (1 - employeeRate)
})

const annualEmployerContribAtom = atom((get) => get(annualGrossSalaryAtom) * get(employerContribRateAtom))

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

function areSimulationDataEqual(a: SimulationData, b: SimulationData) {
  if (
    a.tjm !== b.tjm ||
    a.daysWorked !== b.daysWorked ||
    a.monthlyNetSalary !== b.monthlyNetSalary ||
    a.monthlyIncomeTaxRate !== b.monthlyIncomeTaxRate ||
    a.employeeContribRate !== b.employeeContribRate ||
    a.employerContribRate !== b.employerContribRate ||
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
    employeeContribRate: data.employeeContribRate ?? DEFAULT_SIMULATION_DATA.employeeContribRate,
    employerContribRate: data.employerContribRate ?? DEFAULT_SIMULATION_DATA.employerContribRate,
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
  const [employeeContribRate, setEmployeeContribRate] = useAtom(employeeContribRateAtom)
  const [employerContribRate, setEmployerContribRate] = useAtom(employerContribRateAtom)
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
      employeeContribRate,
      employerContribRate,
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
      employeeContribRate,
      employerContribRate,
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
    setEmployeeContribRate(normalized.employeeContribRate)
    setEmployerContribRate(normalized.employerContribRate)
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
    <Flex direction="column" gap="6">
      <header>
        <Heading size="7" className="text-white">
          Simulateur de revenus SASU (président assimilé salarié)
        </Heading>
        <Text size="3" color="gray">
          Paramétrez vos données (TJM, jours, salaire net visé et charges déductibles) pour estimer la rémunération
          nette et les dividendes après IS et PFU.
        </Text>
      </header>

      <Card>
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Heading size="5">Simulations sauvegardées</Heading>
            <Button onClick={handleCreateSimulation} color="cyan">
              Nouvelle simulation
            </Button>
          </Flex>
          <Text size="2" color="gray">
            Données enregistrées automatiquement dans ce navigateur. Ouvrez, renommez ou supprimez une simulation.
          </Text>
          <Flex direction="column" gap="2">
            {simulations.map((simulation) => {
              const isActive = simulation.id === activeSimulationId
              return (
                <Box
                  key={simulation.id}
                  className={`rounded-lg border px-3 py-3 ${isActive ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-white/10 bg-white/5'}`}
                >
                  <Flex justify="between" align="center" gap="3" wrap="wrap">
                    <div>
                      <Flex align="center" gap="2">
                        <Text size="3" weight="bold" color={isActive ? 'cyan' : 'gray'}>
                          {simulation.name}
                        </Text>
                        {isActive && (
                          <Text size="1" color="cyan" weight="medium" className="uppercase tracking-wide">
                            active
                          </Text>
                        )}
                      </Flex>
                      <Text size="1" color="gray">
                        Mise à jour : {dateFormatter.format(new Date(simulation.updatedAt))}
                      </Text>
                    </div>
                    <Flex gap="2" wrap="wrap" justify="end">
                      {!isActive && (
                        <Button size="2" variant="surface" onClick={() => handleSelectSimulation(simulation.id)}>
                          Ouvrir
                        </Button>
                      )}
                      <Button size="2" variant="surface" color="gray" onClick={() => handleRenameSimulation(simulation.id)}>
                        Renommer
                      </Button>
                      <Button size="2" variant="soft" color="crimson" onClick={() => handleDeleteSimulation(simulation.id)}>
                        Supprimer
                      </Button>
                    </Flex>
                  </Flex>
                </Box>
              )
            })}
          </Flex>
        </Flex>
      </Card>

      <Grid columns="repeat(auto-fit, minmax(320px, 1fr))" gap="4">
        <Card>
          <Flex direction="column" gap="3">
            <Heading size="4">Données activité</Heading>
            <LabeledInput
              label="TJM HT (€)"
              value={tjm}
              onChange={(value) => setTjm(Number(value) || 0)}
            />
            <LabeledInput
              label="Jours facturés dans l'année"
              value={daysWorked}
              onChange={(value) => setDaysWorked(Number(value) || 0)}
            />
            <Text size="2" color="gray">
              Chiffre d'affaires annuel estimé : {currencyFormatter.format(annualTurnover)} HT
            </Text>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="3">
            <Heading size="4">Rémunération salariale</Heading>
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
            <Separator size="4" />
            <Flex direction="column" gap="2" className="text-sm text-white/80">
              <InlineDetail label="Net annuel" value={currencyFormatter.format(annualNetSalary)} />
              <InlineDetail label="Salaire brut annuel" value={currencyFormatter.format(annualGrossSalary)} />
              <InlineDetail label="Charges patronales" value={currencyFormatter.format(annualEmployerContrib)} />
              <InlineDetail label="Coût total de la rémunération" value={currencyFormatter.format(totalPayrollCost)} />
              <InlineDetail label="Net après PAS" value={currencyFormatter.format(netSalaryAfterWithholding)} />
            </Flex>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="3">
            <Flex justify="between" align="center">
              <Heading size="4">Charges déductibles</Heading>
              <Button size="2" onClick={addCharge} variant="soft" color="cyan">
                Ajouter
              </Button>
            </Flex>
            <Inset clip="padding-box" side="all">
              <Flex direction="column" gap="3">
                {deductibleCharges.map((charge) => (
                  <Flex key={charge.id} gap="2" align="center">
                    <TextField.Root
                      value={charge.label}
                      onChange={(event) => updateCharge(charge.id, 'label', event.target.value)}
                      placeholder="Nom de la charge"
                      className="flex-1"
                    />
                    <TextField.Root
                      value={charge.amount || ''}
                      inputMode="decimal"
                      onChange={(event) => updateCharge(charge.id, 'amount', event.target.value)}
                      className="w-32"
                      placeholder="€"
                    />
                    <Button size="2" color="crimson" variant="soft" onClick={() => removeCharge(charge.id)}>
                      Supprimer
                    </Button>
                  </Flex>
                ))}
                {deductibleCharges.length === 0 && (
                  <Text size="2" color="gray">
                    Ajoutez vos charges (logiciels, déplacements, matériel…).
                  </Text>
                )}
              </Flex>
            </Inset>
            <InlineDetail label="Total charges" value={currencyFormatter.format(totalDeductibles)} />
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="3">
            <Heading size="4">Hypothèses SASU</Heading>
            <LabeledInput
              label="Part salariale (net → brut)"
              suffix="%"
              value={(employeeContribRate * 100).toFixed(1)}
              onChange={(value) => setEmployeeContribRate((Number(value) || 0) / 100)}
            />
            <LabeledInput
              label="Charges patronales"
              suffix="%"
              value={(employerContribRate * 100).toFixed(1)}
              onChange={(value) => setEmployerContribRate((Number(value) || 0) / 100)}
            />
            <LabeledInput
              label="IS réduit (0€ → 42 500€)"
              suffix="%"
              value={(corporateTaxReducedRate * 100).toFixed(1)}
              onChange={(value) => setCorporateTaxReducedRate((Number(value) || 0) / 100)}
            />
            <LabeledInput
              label="IS normal (> 42 500€)"
              suffix="%"
              value={(corporateTaxNormalRate * 100).toFixed(1)}
              onChange={(value) => setCorporateTaxNormalRate((Number(value) || 0) / 100)}
            />
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
            <Text size="2" color="gray">
              Ajustez les taux pour refléter votre situation (ACRE, taux réduit d'IS, exonérations locales…).
            </Text>
          </Flex>
        </Card>
      </Grid>

      <Card>
        <Flex direction="column" gap="3">
          <Heading size="5">Résultats annuels</Heading>
          <Grid columns="repeat(auto-fit, minmax(240px, 1fr))" gap="3">
            <SummaryStat label="Résultat avant IS" value={currencyFormatter.format(resultBeforeTax)} tone="amber" />
            <SummaryStat label="IS dû" value={currencyFormatter.format(corporateTax)} tone="amber" />
            <SummaryStat label="Résultat distribuable" value={currencyFormatter.format(distributableResult)} tone="cyan" />
            <SummaryStat label="Dividendes nets (PFU)" value={currencyFormatter.format(netDividends)} tone="cyan" />
            <SummaryStat label="Revenu net total" value={currencyFormatter.format(totalTakeHome)} tone="jade" />
          </Grid>
          <Text size="2" color="gray">
            Le revenu net total additionne la rémunération nette après prélèvement à la source et les dividendes après
            PFU (30 % par défaut). Les montants sont exprimés en euros et arrondis à l'unité.
          </Text>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="3">
          <Heading size="4">Notes méthodologiques</Heading>
          <TextArea
            readOnly
            className="text-sm"
            value={`Hypothèses simplifiées pour une SASU avec président assimilé salarié :\n\n- Charges sociales : ${formatRate(
              employeeContribRate,
            )} salariales (net -> brut) et ${formatRate(employerContribRate)} patronales.\n- IS : ${formatRate(
              corporateTaxReducedRate,
            )} de 0€ à ${corporateTaxThreshold.toLocaleString('fr-FR', {
              maximumFractionDigits: 0,
            })} puis ${formatRate(
              corporateTaxNormalRate,
            )} au-delà.\n- Dividendes : soumis au PFU de ${formatRate(
              dividendFlatTaxRate,
            )} (12,8% IR + 17,2% prélèvements sociaux) sans abattement.\n- Le calcul exclut la TVA et les éventuels acomptes/provisions (URSSAF, IS).\n- Ajustez les taux si vous bénéficiez de dispositifs spécifiques (ACRE, taux réduit d'IS, exonérations locales).`}
          />
        </Flex>
      </Card>
    </Flex>
  )
}

function LabeledInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string
  value: string | number
  onChange: (value: string) => void
  suffix?: string
}) {
  return (
    <Flex direction="column" gap="2">
      <Text as="label" size="2" weight="medium">
        {label}
      </Text>
      <TextField.Root
        value={value}
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        className="w-full"
        placeholder="0"
      >
        {suffix && (
          <TextField.Slot side="right">
            <Text color="gray" size="2">
              {suffix}
            </Text>
          </TextField.Slot>
        )}
      </TextField.Root>
    </Flex>
  )
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'cyan' | 'jade' }) {
  return (
    <Box className="rounded-lg border border-white/10 bg-white/5 px-3 py-3">
      <Text size="2" color="gray" weight="medium">
        {label}
      </Text>
      <Text size="5" weight="bold" color={tone}>
        {value}
      </Text>
    </Box>
  )
}

function InlineDetail({ label, value }: { label: string; value: string }) {
  return (
    <Flex align="center" justify="between" className="text-white/80">
      <Text size="2">{label}</Text>
      <Text size="2" weight="medium">
        {value}
      </Text>
    </Flex>
  )
}

export default Home
