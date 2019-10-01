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
	Flex,
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
				p={3}
				backgroundColor="white">
				<Input
					placeholder="Subject"
					value={subject}
					onChange={handleSubjectChage}
					data-test="conversation-subject"
				/>
			</Box>
			<Box>
				<MessageInput
					user={currentUser}
					value={text}
					onChange={handleTextChange}
					onFileChange={handleFileChange}
					onSubmit={handleSubmit}
				/>
			</Box>
			<Flex p={16} flexDirection="column" alignItems="center">
				<TaskButton
					task={initiateThreadTask}
					primary
					onClick={handleSubmit}
					data-test="start-conversation-button">
					Start conversation
				</TaskButton>
			</Flex>
		</Box>
	)
}
