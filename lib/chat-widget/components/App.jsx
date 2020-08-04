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
	useSetup
} from '@balena/jellyfish-ui-components/lib/SetupProvider'
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
import {
	StreamProviderTask
} from './StreamProviderTask'

export const App = React.memo(({
	productTitle,
	product,
	inbox,
	onClose
}) => {
	const {
		environment
	} = useSetup()

	const store = React.useMemo(() => {
		return createStore({
			product,
			productTitle,
			inbox
		}, {
			environment
		})
	}, [ product, productTitle, inbox, environment ])

	return (
		<StoreProvider store={store}>
			<StreamProviderTask>
				{() => {
					return (
						<Router>
							<Layout flex={1} onClose={onClose}>
								<Route path="/" exact component={IndexRoute} />
								<Route path="/full_thread_list" exact component={FullThreadListRoute} />
								<Route path="/new_thread" exact component={NewThreadRoute} />
								<Route path="/chat/:thread" exact component={ChatRoute} />
							</Layout>
						</Router>
					)
				}}
			</StreamProviderTask>
		</StoreProvider>
	)
})
