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
import CardChatSummary from '../../../lib/ui-components/CardChatSummary'
import {
	InfiniteList
} from '../../../lib/ui-components/InfiniteList'
import {
	Loader
} from '../components/Loader'
import {
	useActions,
	useTask
} from '../hooks'
import {
	selectThreads
} from '../store/selectors'

export const FullThreadListRoute = () => {
	const actions = useActions()
	const threads = useSelector(selectThreads())
	const fetchMoreThreadsTask = useTask(actions.fetchThreads)

	const handleScrollEnding = React.useCallback(async () => {
		await fetchMoreThreadsTask.exec({
			limit: 30
		})
	}, [])

	return (
		<Flex flexDirection="column" flex={1}>
			<Box flex={1} style={{
				position: 'relative'
			}}>
				<InfiniteList onScrollEnding={handleScrollEnding} style={{
					position: 'absolute',
					width: '100%',
					height: '100%'
				}}>
					{threads.map((thread) => {
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
					<Loader
						style={{
							visibility: fetchMoreThreadsTask.started ? 'visible' : 'hidden'
						}}
					/>
				</InfiniteList>
			</Box>
		</Flex>
	)
}
