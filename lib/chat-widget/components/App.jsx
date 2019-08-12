import React from 'react'
import {
	Provider as StoreProvider
} from 'react-redux'
import {
	BrowserRouter as Router, Route
} from 'react-router-dom'
import {
	Provider as ThemeProvider
} from 'rendition'
import {
	InitialRoute
} from '../routes'
import {
	createStore
} from '../store'

export const App = React.memo(() => {
	const store = createStore()

	return (
		<StoreProvider store={store}>
			<ThemeProvider>
				<Router>
					<Route path="/" exact component={InitialRoute} />
				</Router>
			</ThemeProvider>
		</StoreProvider>
	)
})
