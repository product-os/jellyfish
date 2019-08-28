export const selectCardsByType = (type) => {
	return (state) => {
		return state.cards.filter((card) => {
			return card.type === type
		})
	}
}

export const selectCardById = (id) => {
	return (state) => {
		return state.cards.find((card) => {
			return card.id === id
		})
	}
}

export const selectThreads = () => {
	return selectCardsByType('support-thread')
}

export const selectCurrentUser = () => {
	return (state) => {
		return selectCardById(state.currentUser)(state)
	}
}
