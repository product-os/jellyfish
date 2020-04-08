/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Button,
	Txt
} from 'rendition'
import {
	ErrorMessage
} from './ErrorMessage'
import {
	Loader
} from './Loader'

export const Task = ({
	task,
	children,
	...rest
}) => {
	if (!task.finished || task.error) {
		return (
			<Txt align="center" fontSize={13} mt={3} {...rest}>
				{task.finished ? (
					<React.Fragment>
						<ErrorMessage error={task.error} />&nbsp;<Button underline onClick={task.retry} style={{
							display: 'inline'
						}}>Retry</Button>
					</React.Fragment>
				) : (
					<Loader />
				)}
			</Txt>
		)
	}

	return children ? children(task.result) : null
}
