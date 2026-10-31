import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

/* Design system first: tokens, then the primitives built from them, then the
   shared form system. Page-level stylesheets import themselves. */
import './styles/tokens.css'
import './styles/base.css'
import './styles/forms.css'
import './index.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
