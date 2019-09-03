import React from 'react'
import {
	useSelector
} from 'react-redux'
import {
	Box,
	Input
} from 'rendition'
import MessageInput from '../../../lib/ui-components/Timeline/MessageInput'
import {
	TaskButton
} from '../components/TaskButton'
import {
	useActions,
	useTask
} from '../hooks'
import {
	selectCurrentUser
} from '../store/selectors'

export const CreateThread = ({
	renderTaskChildren,
	onSuccess,
	...rest
}) => {
	const currentUser = useSelector(selectCurrentUser())
	const [ subject, setSubject ] = React.useState('')
	const [ text, setText ] = React.useState('')
	const [ files, setFiles ] = React.useState('')
	const actions = useActions()
	const initiateThreadTask = useTask(actions.initiateThread)

	const handleSubjectChage = React.useCallback((event) => {
		setSubject(event.target.value)
	}, [])

	const handleTextChange = React.useCallback((event) => {
		setText(event.target.value)
	}, [])

	const handleFileChange = React.useCallback((event) => {
		setFiles([ ...event.target.files ])
	}, [])

	const handleSubmit = React.useCallback(async () => {
		if (!subject || !text) {
			return
		}

		const taskState = await initiateThreadTask.exec({
			subject,
			text,
			files
		})

		if (taskState.finished && !taskState.error) {
			onSuccess(taskState.result)
		}
	}, [ subject, text, files ])

	return (
		<Box {...rest}>
			<Box
				flex="1"
				p={3}>
				<Input
					placeholder="Subject"
					value={subject}
					onChange={handleSubjectChage}
				/>
			</Box>
			<MessageInput
				user={currentUser}
				value={text}
				onChange={handleTextChange}
				onFileChange={handleFileChange}
				onSubmit={handleSubmit}
			/>
			<Box p={16}>
				<TaskButton task={initiateThreadTask} onClick={handleSubmit}>
					Start thread
				</TaskButton>
			</Box>
		</Box>
	)
}
