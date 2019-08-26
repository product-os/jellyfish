import React from 'react'
import {
	useSelector
} from 'react-redux'
import Timeline from '../../ui-components/Timeline'
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
					<Timeline
						allowWhispers={false}
						card={thread}
						tail={messages}
						usersTyping={usersTyping}
						user={currentUser}
						actions={actions}
					/>
				)
			}}
		</Task>
	)
}
