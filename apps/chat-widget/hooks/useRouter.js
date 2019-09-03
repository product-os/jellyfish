import React from 'react'
import {
	__RouterContext as RouterContext
} from 'react-router-dom'

export const useRouter = () => {
	return React.useContext(RouterContext)
}
