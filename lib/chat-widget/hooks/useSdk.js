import React from 'react'
import {
	createSdk
} from '../sdk'

export const useSdk = () => {
	return React.useMemo(() => {
		return createSdk({
			// eslint-disable-next-line no-process-env
			authToken: process.env.CHAT_WIDGET_JELLYFISH_TOKEN
		})
	}, [])
}
