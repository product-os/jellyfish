import React from 'react'
import Icon from '../../ui/shame/Icon'

export const Task = ({
	task,
	loader = <Icon spin name="cog"/>,
	idle = loader,
	children
}) => {
	React.useEffect(() => {
		if (task.error) {
			console.error(task.error)
		}
	}, [ task.error ])

	if (!task.finished) {
		if (task.started) {
			return loader
		}

		return idle
	}

	if (task.error) {
		return (
			<React.Fragment>
				{task.error.message}&nbsp;<span onClick={task.retry}>Retry</span>
			</React.Fragment>
		)
	}

	return children(task.result)
}
