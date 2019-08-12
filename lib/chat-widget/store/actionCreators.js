import {
	FETCHING_CONVERSATIONS_STARTED,
	FETCHING_CONVERSATIONS_FINISHED
} from './actionTypes'

export const fetchConversations = ({
	dispatch, getState
}, sdk) => {
	return async ({
		limit
	}) => {
		dispatch({
			type: FETCHING_CONVERSATIONS_STARTED
		})

		const state = getState()

		const conversations = await sdk.fetchConversations({
			skip: state.core.conversations.data.length,
			limit
		})

		dispatch({
			type: FETCHING_CONVERSATIONS_FINISHED,
			payload: conversations
		})
	}
}
