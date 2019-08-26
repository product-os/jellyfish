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
	ChatRoute,
	FullThreadListRoute,
	IndexRoute,
	NewThreadRoute
} from '../routes'
import {
	useSetupStreamTask
} from '../hooks'
import {
	createStore
} from '../store'
import {
	Layout
} from './Layout'
import {
	StreamProvider
} from './StreamProvider'
import {
	Task
} from './Task'

export const App = React.memo(() => {
	const store = React.useMemo(() => {
		return createStore()
	}, [])

	const setupStreamTask = useSetupStreamTask()

	React.useEffect(() => {
		setupStreamTask.exec()
	}, [])

	return (
		<Task task={setupStreamTask}>
			{(stream) => {
				return (
					<StreamProvider stream={stream}>
						<StoreProvider store={store}>
							<ThemeProvider style={{
								height: '100%', display: 'flex', flexDirection: 'column'
							}}>
								<Router>
									<Layout flex={1}>
										<Route path="/" exact component={IndexRoute} />
										<Route path="/chat/:thread" exact component={ChatRoute} />
										<Route path="/new_thread" exact component={NewThreadRoute} />
										<Route path="/full_thread_list" exact component={FullThreadListRoute} />
									</Layout>
								</Router>
							</ThemeProvider>
						</StoreProvider>
					</StreamProvider>
				)
			}}
		</Task>
	)
})
