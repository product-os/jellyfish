import React from 'react'
import {
	useSelector
} from 'react-redux'
import {
	useActions
} from '../hooks/useActions'
import {
	selectConversations
} from '../store/selectors'

export const InitialRoute = () => {
	const conversations = useSelector(selectConversations)
	const {
		fetchConversations
	} = useActions()

	React.useEffect(() => {
		fetchConversations({
			limit: 2
		})
	}, [])

	return (
		JSON.stringify(conversations)
	)
}
