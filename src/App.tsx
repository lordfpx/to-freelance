import { Flex, Heading, Separator, Text } from '@radix-ui/themes'
import Home from './views/Home'

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
      </Flex>
      <Separator size="4" className="mb-6" />
      <Home />
    </div>
  )
}

export default App
