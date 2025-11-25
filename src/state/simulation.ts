import { atom } from 'jotai'
import { nanoid } from 'nanoid'

export type DeductibleCharge = {
  id: string
  label: string
  amount: number
}

export type SimulationData = {
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

export type Simulation = {
  id: string
  name: string
  data: SimulationData
  updatedAt: number
}

export const SIMULATIONS_KEY = 'sasu-simulations'
export const ACTIVE_SIMULATION_KEY = 'sasu-active-simulation-id'
// Coefficients moyens 2025 pour un président assimilé salarié (charges hors cas particuliers)
export const EMPLOYEE_CONTRIB_RATE = 0.225 // charges salariales ~22,5 %
export const EMPLOYER_CONTRIB_RATE = 0.433 // charges patronales ~43,3 %

export const DEFAULT_SIMULATION_DATA: SimulationData = {
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

// Inputs
export const tjmAtom = atom(DEFAULT_SIMULATION_DATA.tjm)
export const daysWorkedAtom = atom(DEFAULT_SIMULATION_DATA.daysWorked)
export const monthlyNetSalaryAtom = atom(DEFAULT_SIMULATION_DATA.monthlyNetSalary)
export const monthlyIncomeTaxRateAtom = atom(DEFAULT_SIMULATION_DATA.monthlyIncomeTaxRate)

export const deductibleChargesAtom = atom<DeductibleCharge[]>(DEFAULT_SIMULATION_DATA.deductibleCharges)

// Assumptions for a SASU with président assimilé salarié
export const corporateTaxReducedRateAtom = atom(DEFAULT_SIMULATION_DATA.corporateTaxReducedRate)
export const corporateTaxNormalRateAtom = atom(DEFAULT_SIMULATION_DATA.corporateTaxNormalRate)
export const corporateTaxThresholdAtom = atom(DEFAULT_SIMULATION_DATA.corporateTaxThreshold)
export const dividendFlatTaxRateAtom = atom(DEFAULT_SIMULATION_DATA.dividendFlatTaxRate)

// Derived values
export const annualTurnoverAtom = atom((get) => get(tjmAtom) * get(daysWorkedAtom))

export const annualNetSalaryAtom = atom((get) => get(monthlyNetSalaryAtom) * 12)

export const annualGrossSalaryAtom = atom((get) => {
  const net = get(annualNetSalaryAtom)
  return net / (1 - EMPLOYEE_CONTRIB_RATE)
})

export const annualEmployerContribAtom = atom((get) => get(annualGrossSalaryAtom) * EMPLOYER_CONTRIB_RATE)

export const totalPayrollCostAtom = atom((get) => get(annualGrossSalaryAtom) + get(annualEmployerContribAtom))

export const totalDeductiblesAtom = atom((get) => get(deductibleChargesAtom).reduce((sum, item) => sum + item.amount, 0))

export const resultBeforeTaxAtom = atom((get) => get(annualTurnoverAtom) - get(totalPayrollCostAtom) - get(totalDeductiblesAtom))

export const corporateTaxAtom = atom((get) => {
  const taxable = Math.max(0, get(resultBeforeTaxAtom))
  const threshold = get(corporateTaxThresholdAtom)
  const reducedRate = get(corporateTaxReducedRateAtom)
  const normalRate = get(corporateTaxNormalRateAtom)

  const reducedBase = Math.min(taxable, threshold)
  const normalBase = Math.max(0, taxable - threshold)

  return reducedBase * reducedRate + normalBase * normalRate
})

export const distributableResultAtom = atom((get) => get(resultBeforeTaxAtom) - get(corporateTaxAtom))

export const netDividendsAtom = atom((get) => Math.max(0, get(distributableResultAtom) * (1 - get(dividendFlatTaxRateAtom))))

export const netSalaryAfterWithholdingAtom = atom((get) => {
  const annualNet = get(annualNetSalaryAtom)
  const rate = get(monthlyIncomeTaxRateAtom)
  return annualNet * (1 - rate)
})

export const totalTakeHomeAtom = atom((get) => get(netSalaryAfterWithholdingAtom) + get(netDividendsAtom))

export const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})
