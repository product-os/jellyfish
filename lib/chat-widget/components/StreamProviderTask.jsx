/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Task
} from '../components/Task'
import {
	useSetupStreamTask
} from '../hooks'

export const streamContext = React.createContext()

export const StreamProviderTask = ({
	children
}) => {
	const setupStreamTask = useSetupStreamTask()

	React.useEffect(() => {
		setupStreamTask.exec()
	}, [])

	return (
		<Task task={setupStreamTask}>
			{(stream) => {
				return (
					<streamContext.Provider value={stream}>{children(stream)}</streamContext.Provider>
				)
			}}
		</Task>
	)
}
