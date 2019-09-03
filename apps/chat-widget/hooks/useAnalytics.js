import React from 'react'
import Analytics from '../../../lib/ui/services/analytics'
import * as environment from '../environment'

export const useAnalytics = () => {
	return React.useMemo(() => {
		return new Analytics({
			token: environment.analytics.mixpanel.token
		})
	}, [])
}
