/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Provider as StoreProvider
} from 'react-redux'
import {
	MemoryRouter as Router, Route
} from 'react-router-dom'
import {
	Provider as ThemeProvider
} from 'rendition'
import {
	SetupProvider
} from '../../../lib/ui-components/SetupProvider'
import {
	useAnalytics,
	useSdk
} from '../hooks'
import {
	IndexRoute,
	ChatRoute,
	FullThreadListRoute,
	NewThreadRoute
} from '../routes'
import {
	createStore
} from '../store'
import {
	Layout
} from './Layout'

export const App = React.memo(() => {
	const sdk = useSdk()
	const analytics = useAnalytics()
	const store = React.useMemo(() => {
		return createStore()
	}, [])

	return (
		<StoreProvider store={store}>
			<SetupProvider
				sdk={sdk}
				analytics={analytics}>
				<ThemeProvider style={{
					height: '100%', display: 'flex', flexDirection: 'column'
				}}>
					<Router>
						<Layout flex={1}>
							<Route path="/" exact component={IndexRoute} />
							<Route path="/full_thread_list" exact component={FullThreadListRoute} />
							<Route path="/new_thread" exact component={NewThreadRoute} />
							<Route path="/chat/:thread" exact component={ChatRoute} />
						</Layout>
					</Router>
				</ThemeProvider>
			</SetupProvider>
		</StoreProvider>
	)
})
