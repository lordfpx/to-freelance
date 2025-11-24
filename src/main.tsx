import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Provider as JotaiProvider } from 'jotai'
import { Theme } from '@radix-ui/themes'
import router from './router'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <JotaiProvider>
      <Theme appearance="dark" accentColor="cyan" grayColor="slate" radius="large">
        <RouterProvider router={router} />
      </Theme>
    </JotaiProvider>
  </React.StrictMode>,
)
