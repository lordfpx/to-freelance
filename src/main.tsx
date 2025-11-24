import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider as JotaiProvider } from 'jotai'
import { Theme } from '@radix-ui/themes'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <JotaiProvider>
      <Theme appearance="dark" accentColor="cyan" grayColor="slate" radius="large">
        <App />
      </Theme>
    </JotaiProvider>
  </React.StrictMode>,
)
