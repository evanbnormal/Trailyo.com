import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

if (typeof document !== 'undefined') {
  createRoot(document.getElementById("root")!).render(<App />);
}
