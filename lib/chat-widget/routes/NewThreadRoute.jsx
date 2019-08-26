import React from 'react'
import {
	Redirect
} from 'react-router-dom'
import {
	NewThread
} from '../components/NewThread'

export const NewThreadRoute = () => {
	const renderTaskChildren = React.useCallback(({
		thread
	}) => {
		return (
			<Redirect to={`/chat/${thread.id}`} />
		)
	}, [])

	return (
		<NewThread
			renderTaskChildren={renderTaskChildren}
		/>
	)
}
