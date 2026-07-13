import { useEffect, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemeMode } from './ThemeContext'

interface ThemeProviderProps {
  children: ReactNode
}

const THEME_KEY = 'control-gastos-theme'

function getInitialTheme(): ThemeMode {
  const storedTheme = localStorage.getItem(THEME_KEY)

  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme
  }

  return 'light'
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
    document.documentElement.dataset.theme = theme
    document.body.dataset.theme = theme
  }, [theme])

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === 'light' ? 'dark' : 'light'
    )
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
