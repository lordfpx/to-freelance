import { Link, Outlet } from 'react-router-dom'
import { Flex, Heading, Separator, Text } from '@radix-ui/themes'

function App() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <Flex align="center" justify="between" mb="4">
        <div>
          <Heading size="6">Simulateur revenus SASU</Heading>
          <Text as="p" size="2" color="gray">
            TJM → rémunération + dividendes (France, président assimilé salarié)
          </Text>
        </div>
        <nav className="flex gap-4 text-sm font-semibold uppercase tracking-wide text-cyan-300">
          <Link to="/">Accueil</Link>
        </nav>
      </Flex>
      <Separator size="4" className="mb-6" />
      <Outlet />
    </div>
  )
}

export default App
