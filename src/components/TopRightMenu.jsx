import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Receipt, LogOut } from 'lucide-react'

export default function TopRightMenu() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Toggle dropdown
  const toggleMenu = () => setIsOpen(prev => !prev)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleAllTransactionsClick = () => {
    navigate('/transactions')
    setIsOpen(false)
  }

  const handleSignOutClick = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  return (
    <div className="top-right-menu-container" ref={dropdownRef}>
      <button 
        className="top-right-menu-btn" 
        onClick={toggleMenu}
        aria-label="Open menu"
        type="button"
      >
        <MoreVertical size={20} />
      </button>

      {isOpen && (
        <div className="top-right-menu-dropdown">
          <button 
            className="top-right-menu-item" 
            onClick={handleAllTransactionsClick}
            type="button"
          >
            <Receipt size={16} />
            <span>Transactions</span>
          </button>
          
          <button 
            className="top-right-menu-item danger" 
            onClick={handleSignOutClick}
            type="button"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  )
}
