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

const deductibleChargesAtom = atom<DeductibleCharge[]>([
  { id: nanoid(), label: 'Logiciels et abonnements', amount: 1800 },
  { id: nanoid(), label: 'Matériel et amortissements', amount: 2200 },
  { id: nanoid(), label: 'Frais de déplacement', amount: 1200 },
])

// Assumptions for a SASU with président assimilé salarié
const employeeContribRateAtom = atom(0.22) // net -> gross uplift
const employerContribRateAtom = atom(0.45)
const corporateTaxRateAtom = atom(0.25)
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

const corporateTaxAtom = atom((get) => Math.max(0, get(resultBeforeTaxAtom) * get(corporateTaxRateAtom)))

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

function formatRate(value: number) {
  return `${(value * 100).toFixed(1)} %`
}

function Home() {
  const [tjm, setTjm] = useAtom(tjmAtom)
  const [daysWorked, setDaysWorked] = useAtom(daysWorkedAtom)
  const [monthlyNetSalary, setMonthlyNetSalary] = useAtom(monthlyNetSalaryAtom)
  const [monthlyTaxRate, setMonthlyTaxRate] = useAtom(monthlyIncomeTaxRateAtom)
  const [deductibleCharges, setDeductibleCharges] = useAtom(deductibleChargesAtom)
  const [employeeContribRate, setEmployeeContribRate] = useAtom(employeeContribRateAtom)
  const [employerContribRate, setEmployerContribRate] = useAtom(employerContribRateAtom)
  const [corporateTaxRate, setCorporateTaxRate] = useAtom(corporateTaxRateAtom)
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
              value={(monthlyTaxRate * 100).toFixed(1)}
              onChange={(value) => setMonthlyTaxRate((Number(value) || 0) / 100)}
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
              label="Taux IS"
              suffix="%"
              value={(corporateTaxRate * 100).toFixed(1)}
              onChange={(value) => setCorporateTaxRate((Number(value) || 0) / 100)}
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
              corporateTaxRate,
            )} sur le résultat positif après charges et rémunération.\n- Dividendes : soumis au PFU de ${formatRate(
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
