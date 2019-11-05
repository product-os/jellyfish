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
	Box,
	Flex
} from 'rendition'
import {
	ButtonLink
} from '../components/ButtonLink'
import {
	CreateThread
} from '../components/CreateThread'
import {
	Heading
} from '../components/Heading'
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
			<Flex
				flex={1}
				p={16}
				flexDirection="column"
				alignItems="center"
				data-test="initial-create-conversation-page">
				<Box>
					<Heading
						primaryText="Welcome"
						secondaryText="Our team will reply to your questions &
						solve your problems in realtime as soon as possible."
					/>
				</Box>
				<Box alignSelf="stretch">
					<CreateThread onSuccess={handleCreateThreadSuccess} />
				</Box>
			</Flex>
		)
	}

	return (
		<Flex
			flex={1}
			p={16}
			flexDirection="column"
			alignItems="center"
			data-test="initial-short-conversation-page"
			style={{
				overflow: 'hidden'
			}}>
			<Box>
				<Heading
					primaryText="Welcome"
					secondaryText="Our team will reply to your questions & solve your problems in realtime as soon as possible."
				/>
			</Box>
			<Box mb={30}>
				<ButtonLink
					primary
					to="/new_thread"
					data-test="start-new-conversation-button">
					Start new conversation
				</ButtonLink>
			</Box>
			<Box alignSelf="stretch" style={{
				overflowY: 'auto'
			}}>
				{threads.slice(0, 2).map((thread) => {
					return (
						<ThreadListItem
							key={thread.id}
							thread={thread}
						/>
					)
				})}
			</Box>
			<Box mt={30}>
				{threads.length > 2 && (
					<ButtonLink
						to="/full_thread_list"
						underline
						data-test="view-all-conversations-button">
						View all conversations
					</ButtonLink>
				)}
			</Box>
		</Flex>
	)
}
