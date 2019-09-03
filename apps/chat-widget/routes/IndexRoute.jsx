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
import CardChatSummary from '../../../lib/ui-components/CardChatSummary'
import {
	CreateThread
} from '../components/CreateThread'
import {
	useActions,
	useRouter
} from '../hooks'
import {
	selectThreads
} from '../store/selectors'

export const IndexRoute = () => {
	const actions = useActions()
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
						<CardChatSummary
							key={thread.id}
							getActor={actions.getActor}
							card={thread}
							to={`/chat/${thread.id}`}
							active={false}
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
