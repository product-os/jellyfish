/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'

export const selectCardsByType = (type) => {
	return (state) => {
		return _.filter(state.cards, (card) => {
			return card.type.split('@')[0] === type
		})
	}
}

export const selectCardById = (id) => {
	return (state) => {
		return state.cards[id] || null
	}
}

export const selectThreads = () => {
	return (state) => {
		const threads = selectCardsByType('support-thread')(state)
		return _.orderBy(threads, (thread) => {
			const messages = selectMessages(thread.id)(state)
			return messages.length ? messages[0].data.timestamp : thread.created_at
		}, 'desc')
	}
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
