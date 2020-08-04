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
import Timeline from '@balena/jellyfish-ui-components/lib/Timeline'
import {
	useSetup
} from '@balena/jellyfish-ui-components/lib/SetupProvider'
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
	// Using an empty types array will effectively disable the autocomplete
	// trigger that uses the types
	const types = []
	const {
		sdk,
		environment
	} = useSetup()
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
	const usersTyping = React.useMemo(() => {
		return {}
	}, [])

	const timelineHeaderOptions = React.useMemo(() => {
		return {
			title: _.get(thread, [ 'name' ]),
			buttons: {
				toggleWhispers: false,
				toggleEvents: false
			}
		}
	}, [ thread ])

	return (
		<Task task={fetchThreadTask}>
			{() => {
				return (
					<Box
						flex={1}
						style={{
							position: 'relative'
						}}
						data-test="chat-page"
						data-test-id={thread.id}
					>
						<Box style={{
							position: 'absolute',
							width: '100%',
							height: '100%'
						}}>
							<Timeline
								selectCard={(id, type) => {
									return (state) => {
										return selectCardById(id)(state)
									}
								}}
								getCard={actions.getCard}
								enableAutocomplete={!environment.isTest()}
								sdk={sdk}
								types={types}

								// TODO: #4229 add support for correctly identifying and formatting group mentions in the chat widget
								groups={null}
								wide={false}
								allowWhispers={false}
								card={thread}
								tail={messages}
								usersTyping={usersTyping}
								user={currentUser}
								getActor={actions.getActor}
								addNotification={actions.addNotification}
								signalTyping={_.noop}
								setTimelineMessage={_.noop}
								eventMenuOptions={false}
								headerOptions={timelineHeaderOptions}
							/>
						</Box>
					</Box>
				)
			}}
		</Task>
	)
}
