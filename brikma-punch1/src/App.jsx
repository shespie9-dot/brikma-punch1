import { useState } from 'react'
import Login from './pages/Login'
import EmployePunch from './pages/EmployePunch'
import PatronDashboard from './pages/PatronDashboard'

export default function App() {
  const [session, setSession] = useState(null)
  // session = { role: 'employe'|'patron', employe: {...} | null }

  if (!session) return <Login onLogin={setSession} />
  if (session.role === 'patron') return <PatronDashboard onLogout={() => setSession(null)} />
  return <EmployePunch employe={session.employe} onLogout={() => setSession(null)} />
}
