import React from 'react'
import {
	createSdk
} from '../sdk'

export const useSdk = () => {
	return React.useMemo(() => {
		return createSdk({
			authToken: '8d6f0b8e-3749-4c95-af80-04ccd0c5a6b4'
		})
	}, [])
}
