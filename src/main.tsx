import './amplifyConfig'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AccessProvider } from './access/AccessProvider'
import './index.css'
import StoryFontPicker from './StoryFontPicker'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AccessProvider>
      <App />
      {import.meta.env.DEV && new URLSearchParams(window.location.search).has('storyfont') && <StoryFontPicker />}
    </AccessProvider>
  </React.StrictMode>,
)
