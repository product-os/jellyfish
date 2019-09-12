/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	useSelector
} from 'react-redux'
import {
	Box
} from 'rendition'
import Timeline from '../../../lib/ui-components/Timeline'
import {
	Task
} from '../components/Task'
import {
	useActions,
	useRouter,
	useTask
} from '../hooks'
import {
	selectCurrentUser,
	selectMessages,
	selectCardById
} from '../store/selectors'

export const ChatRoute = () => {
	const router = useRouter()
	const actions = useActions()
	const fetchThreadTask = useTask(actions.fetchThread)
	const currentUser = useSelector(selectCurrentUser())
	const thread = useSelector(selectCardById(router.match.params.thread))
	const messages = useSelector(selectMessages(router.match.params.thread))

	React.useEffect(() => {
		fetchThreadTask.exec(router.match.params.thread)
	}, [])

	// ToDo: implement this
	const usersTyping = React.memo(() => {
		return {}
	}, [])

	return (
		<Task task={fetchThreadTask}>
			{() => {
				return (
					<Box flex={1} style={{
						position: 'relative'
					}}>
						<Box style={{
							position: 'absolute',
							width: '100%',
							height: '100%'
						}}>
							<Timeline
								allowWhispers={false}
								card={thread}
								tail={messages}
								usersTyping={usersTyping}
								user={currentUser}
								getActor={actions.getActor}
								addNotification={actions.addNotification}
								signalTyping={_.noop}
								setTimelineMessage={_.noop}
							/>
						</Box>
					</Box>
				)
			}}
		</Task>
	)
}
