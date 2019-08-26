import React from 'react'
import {
	ThemeContext
} from 'grommet/contexts/ThemeContext/ThemeContext'

export const useTheme = () => {
	return React.useContext(ThemeContext)
}
