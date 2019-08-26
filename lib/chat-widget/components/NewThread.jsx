import React from 'react'
import {
	useSelector
} from 'react-redux'
import {
	Box,
	Button,
	Input
} from 'rendition'
import MessageInput from '../../ui-components/Timeline/MessageInput'
import {
	Task
} from '../components/Task'
import {
	useActions,
	useTask
} from '../hooks'
import {
	selectCurrentUser
} from '../store/selectors'

export const NewThread = ({
	renderTaskChildren, ...rest
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

	const handleSubmit = React.useCallback(() => {
		if (!subject || !text) {
			return
		}

		initiateThreadTask.exec({
			subject,
			text,
			files
		})
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
				<Button onClick={handleSubmit} disabled={initiateThreadTask.started}>
					<Task task={initiateThreadTask} idle="Start thread">
						{renderTaskChildren}
					</Task>
				</Button>
			</Box>
		</Box>
	)
}
