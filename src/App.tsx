import Home from './views/Home'

function App() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-4xl font-semibold text-white">Simulateur revenus SASU</h1>
          <p className="text-sm text-white/70">
            TJM → rémunération + dividendes (France, président assimilé salarié)
          </p>
        </div>
      </div>

      <Home />
    </div>
  )
}

export default App
