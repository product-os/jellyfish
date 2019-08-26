import React from 'react'
import {
	Flex, Box
} from 'rendition'
import {
	Header
} from './Header'
import {
	Task
} from './Task'
import {
	useActions,
	useCombineTasks,
	useTask
} from '../hooks'

export const Layout = ({
	children, ...rest
}) => {
	const actions = useActions()
	const fetchThreads = useTask(actions.fetchThreads)
	const setCurrentUser = useTask(actions.setCurrentUser)
	const combinedTask = useCombineTasks(fetchThreads, setCurrentUser)

	React.useEffect(() => {
		fetchThreads.exec({
			limit: 2
		})

		setCurrentUser.exec()
	}, [])

	return (
		<Flex {...rest} flexDirection="column">
			<Header />
			<Box flex={1}>
				<Task task={combinedTask}>{() => { return children }}</Task>
			</Box>
		</Flex>
	)
}
