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
import CardChatSummary from '../../ui-components/CardChatSummary'
import {
	useActions
} from '../hooks'
import {
	selectThreads
} from '../store/selectors'

export const IndexRoute = () => {
	const actions = useActions()
	const threads = useSelector(selectThreads())

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
				{threads.length > 2 && (
					<Link to="/full_thread_list">View all conversations</Link>
				)}
			</Box>
		</Flex>
	)
}
