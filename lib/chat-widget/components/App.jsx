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
	IndexRoute
} from '../routes'
import {
	createStore
} from '../store'
import {
	Layout
} from './Layout'

export const App = React.memo(() => {
	const store = React.useMemo(() => {
		return createStore()
	}, [])

	return (
		<StoreProvider store={store}>
			<ThemeProvider style={{
				height: '100%', display: 'flex', flexDirection: 'column'
			}}>
				<Router>
					<Layout flex={1}>
						<Route path="/" exact component={IndexRoute} />
					</Layout>
				</Router>
			</ThemeProvider>
		</StoreProvider>
	)
})
