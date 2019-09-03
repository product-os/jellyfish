import React from 'react'
import {
	getSdk
} from '../../../lib/sdk'
import * as environment from '../environment'

export const useSdk = () => {
	return React.useMemo(() => {
		return getSdk({
			apiPrefix: environment.api.prefix,
			apiUrl: environment.api.url,
			authToken: environment.api.token
		})
	}, [])
}
