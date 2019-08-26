import React from 'react'
import {
	useSelector
} from 'react-redux'
import {
	Redirect
} from 'react-router-dom'
import {
	Box,
	Button,
	Flex
} from 'rendition'
import CardChatSummary from '../../ui-components/CardChatSummary'
import {
	NewThread
} from '../components/NewThread'
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

	const handleStartNewThread = React.useCallback(() => {
		router.history.push('/new_thread')
	}, [])

	const renderTaskChildren = React.useCallback(({
		thread
	}) => {
		return (
			<Redirect to={`/chat/${thread.id}`} push />
		)
	}, [])

	if (!threads.length) {
		return (
			<NewThread
				renderTaskChildren={renderTaskChildren}
			/>
		)
	}

	return (
		<Flex flex={1} flexDirection="column">
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
				<Button onClick={handleStartNewThread}>Start new conversation</Button>
			</Box>
		</Flex>
	)
}
