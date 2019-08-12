import {
	FETCHING_CONVERSATIONS_STARTED,
	FETCHING_CONVERSATIONS_FINISHED
} from './actionTypes'

const initialState = {
	core: {
		conversations: {
			data: [],
			fetching: false
		}
	}
}

export const reducer = (state = initialState, action) => {
	switch (action.type) {
		case FETCHING_CONVERSATIONS_STARTED:
			return {
				...state,
				core: {
					...state.core,
					conversations: {
						...state.core.conversations,
						fetching: true
					}
				}
			}
		case FETCHING_CONVERSATIONS_FINISHED:
			return {
				...state,
				core: {
					...state.core,
					conversations: {
						...state.core.conversations,
						fetching: false,
						data: action.payload.concat(state.core.conversations.data)
					}
				}
			}
		default:
			return state
	}
}
