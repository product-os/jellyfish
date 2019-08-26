export const selectCardsByType = (type) => {
	return (state) => {
		return (state.cards.byType[type] || []).map((id) => {
			return state.cards.byId[id]
		})
	}
}

export const selectCardById = (id) => {
	return (state) => {
		return state.cards.byId[id]
	}
}

export const selectThreads = () => {
	return selectCardsByType('support-thread')
}

export const selectCurrentUser = () => {
	return (state) => {
		return state.cards.byId[state.currentUser]
	}
}

export const selectMessages = (threadId) => {
	return (state) => {
		return selectCardsByType('message')(state).filter((message) => {
			return message.data.target === threadId
		})
	}
}
