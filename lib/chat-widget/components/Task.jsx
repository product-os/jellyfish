/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Button,
	Flex
} from 'rendition'
import {
	ErrorMessage
} from './ErrorMessage'
import {
	Loader
} from './Loader'

export const Task = ({
	task,
	children
}) => {
	if (!task.finished || task.error) {
		return (
			<Flex fontSize={13} mt={3} justifyContent="center">
				{task.finished ? (
					<React.Fragment>
						<ErrorMessage error={task.error} />&nbsp;<Button underline onClick={task.retry}>Retry</Button>
					</React.Fragment>
				) : (
					<Loader />
				)}
			</Flex>
		)
	}

	return children ? children(task.result) : null
}
