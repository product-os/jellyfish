/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Flex, useTheme
} from 'rendition'
import {
	Task
} from './Task'
import {
	useActions,
	useCombineTasks,
	useTask
} from '../hooks'
import {
	INITIAL_FETCH_CONVERSATIONS_LIMIT
} from '../constants'
import {
	Header
} from './Header'

export const Layout = ({
	children, ...rest
}) => {
	const actions = useActions()
	const fetchThreads = useTask(actions.fetchThreads)
	const setCurrentUser = useTask(actions.setCurrentUser)
	const combinedTask = useCombineTasks(fetchThreads, setCurrentUser)
	const theme = useTheme()

	React.useEffect(() => {
		fetchThreads.exec({
			limit: INITIAL_FETCH_CONVERSATIONS_LIMIT
		})

		setCurrentUser.exec()
	}, [])

	return (
		<Flex {...rest}
			flexDirection="column"
			color={theme.colors.secondary.main}
			backgroundColor={theme.colors.quartenary.light}>
			<Header />
			<Flex flex={1} flexDirection="column">
				<Task task={combinedTask}>{() => { return children }}</Task>
			</Flex>
		</Flex>
	)
}
