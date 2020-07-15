/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

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
	const icon = task.started ? <Loader color="white" /> : null

	return (
		<React.Fragment>
			{task.error && <ErrorMessage mb={4}>{task.error.message}</ErrorMessage>}
			<Button
				disabled={task.started}
				icon={icon}
				{...rest}>
				{children}
			</Button>
		</React.Fragment>
	)
}
