import React from 'react'
import {
	Button
} from 'rendition'
import {
	ErrorMessage
} from './ErrorMessage'
import {
	Loader
} from './Loader'

export const TaskButton = ({
	task, children, ...rest
}) => {
	const icon = task.started && <Loader />

	return (
		<React.Fragment>
			{task.error && (
				<ErrorMessage error={task.error} pb={4} />
			)}
			<Button
				disabled={task.started}
				icon={icon}
				{...rest}>
				{children}
			</Button>
		</React.Fragment>
	)
}
