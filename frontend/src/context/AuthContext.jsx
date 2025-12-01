/**
 * Authentication Context
 */
import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api/client'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('access_token')
      if (token) {
        try {
          const response = await authAPI.getCurrentUser()
          setUser(response.data)
        } catch (error) {
          console.error('Failed to load user:', error)
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')
        }
      }
      setLoading(false)
    }

    loadUser()
  }, [])

  const login = async (username, password) => {
    try {
      const response = await authAPI.login(username, password)
      const { access_token } = response.data

      // Save token
      localStorage.setItem('access_token', access_token)

      // Get user info
      const userResponse = await authAPI.getCurrentUser()
      setUser(userResponse.data)

      toast.success('Login successful!')
      return true
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  const register = async (username, password) => {
    try {
      await authAPI.register(username, password)
      toast.success('Registration successful! Please login.')
      return true
    } catch (error) {
      console.error('Registration failed:', error)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
    toast.success('Logged out successfully')
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
