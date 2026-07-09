import { useEffect, useState } from 'react'
import './App.css'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import HowItWorksPage from './pages/HowItWorksPage'
import ContactPage from './pages/ContactPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  const [currentPage, setCurrentPage] = useState(() => window.location.pathname)

  useEffect(() => {
    const handlePopState = () => setCurrentPage(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && window.location.pathname === '/login') {
      setCurrentPage('/dashboard')
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])

  const navigate = (path) => {
    window.history.pushState({}, '', path)
    setCurrentPage(path)
  }

  const renderPage = () => {
    switch (currentPage) {
      case '/about':
        return <AboutPage currentPage={currentPage} onNavigate={navigate} />
      case '/how-it-works':
        return <HowItWorksPage currentPage={currentPage} onNavigate={navigate} />
      case '/contact':
        return <ContactPage currentPage={currentPage} onNavigate={navigate} />
      case '/login':
        return <LoginPage currentPage={currentPage} onNavigate={navigate} />
      case '/register':
        return <RegisterPage currentPage={currentPage} onNavigate={navigate} />
      case '/dashboard':
        return <DashboardPage currentPage={currentPage} onNavigate={navigate} />
      default:
        return <HomePage currentPage={currentPage} onNavigate={navigate} />
    }
  }

  return renderPage()
}

export default App
