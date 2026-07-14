import { useEffect, useState } from 'react'
import './App.css'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import HowItWorksPage from './pages/HowItWorksPage'
import ContactPage from './pages/ContactPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminRegisterPage from './pages/AdminRegisterPage'
import DashboardPage from './pages/DashboardPage'
import Footer from "./components/Footer";

function App() {
  const [currentPage, setCurrentPage] = useState(() => window.location.pathname)

  useEffect(() => {
    const handlePopState = () => setCurrentPage(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && (window.location.pathname === '/login' || window.location.pathname === '/admin/login')) {
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
      case '/admin/login':
        return <AdminLoginPage currentPage={currentPage} onNavigate={navigate} />
      case '/admin/register':
        return <AdminRegisterPage currentPage={currentPage} onNavigate={navigate} />
      case '/dashboard':
        return <DashboardPage currentPage={currentPage} onNavigate={navigate} />
      default:
        return <HomePage currentPage={currentPage} onNavigate={navigate} />
    }
  }

return (
  <>
    {renderPage()}

    {currentPage !== "/dashboard" && <Footer onNavigate={navigate} />}
  </>
);
}

export default App
