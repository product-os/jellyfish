/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	useSelector
} from 'react-redux'
import {
	Link
} from 'react-router-dom'
import {
	Box,
	Flex
} from 'rendition'
import {
	CreateThread
} from '../components/CreateThread'
import {
	ThreadListItem
} from '../components/ThreadListItem'
import {
	useRouter
} from '../hooks'
import {
	selectThreads
} from '../store/selectors'

export const IndexRoute = () => {
	const router = useRouter()
	const threads = useSelector(selectThreads())
	const isInCreateThreadMode = React.useMemo(() => {
		return !threads.length
	}, [])

	const handleCreateThreadSuccess = React.useCallback(({
		thread
	}) => {
		router.history.push(`/chat/${thread.id}`)
	}, [])

	if (isInCreateThreadMode) {
		return (
			<CreateThread onSuccess={handleCreateThreadSuccess} />
		)
	}

	return (
		<Flex flex={1} flexDirection="column">
			<Box p={16}>
				<Link to="/new_thread">Start new conversation</Link>
			</Box>
			<Box>
				{threads.slice(0, 2).map((thread) => {
					return (
						<ThreadListItem
							key={thread.id}
							thread={thread}
						/>
					)
				})}
			</Box>
			<Box p={16}>
				{threads.length > 2 && (
					<Link to="/full_thread_list">View all conversations</Link>
				)}
			</Box>
		</Flex>
	)
}
