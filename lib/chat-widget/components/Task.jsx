import React from 'react'
import {
	Txt
} from 'rendition'
import Icon from '../../ui/shame/Icon'
import {
	ErrorMessage
} from './ErrorMessage'

export const Task = ({
	task,
	loader = <Icon spin name="cog"/>,
	children
}) => {
	React.useEffect(() => {
		if (task.error) {
			console.error(task.error)
		}
	}, [ task.error ])

	if (!task.finished) {
		return loader
	}

	if (task.error) {
		return (
			<React.Fragment>
				<ErrorMessage error={task.error} />{' '}<Txt.span onClick={task.retry}>Retry</Txt.span>
			</React.Fragment>
		)
	}

	return children(task.result)
}
