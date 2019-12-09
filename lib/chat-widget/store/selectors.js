/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'

export const selectCardsByType = (type) => {
	return (state) => {
		return state.cards.filter((card) => {
			return card.type.split('@')[0] === type
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

export const selectMessages = (threadId) => {
	return (state) => {
		const messages = selectCardsByType('message')(state)
		return _.chain(messages)
			.filter([ 'data.target', threadId ])
			.sortBy('data.timestamp')
			.value()
	}
}
