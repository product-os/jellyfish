/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
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
	children
}) => {
	if (!task.finished) {
		return <Loader />
	}

	if (task.error) {
		return (
			<React.Fragment>
				<ErrorMessage error={task.error} />{' '}<Txt.span onClick={task.retry}>Retry</Txt.span>
			</React.Fragment>
		)
	}

	return children ? children(task.result) : null
}
