/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import update from 'immutability-helper'
import {
	SET_CARDS,
	SET_CURRENT_USER
} from './action-types'

const mergeCards = (state, cards) => {
	return cards.reduce((newCards, card) => {
		newCards[card.id] = _.merge({}, newCards[card.id], card)
		return newCards
	}, state.cards)
}

export const createReducer = ({
	product,
	productTitle,
	inbox
}) => {
	const initialState = {
		product,
		productTitle,
		inbox,
		cards: {},
		currentUser: null
	}

	return (state = initialState, action) => {
		switch (action.type) {
			case SET_CARDS: {
				return update(state, {
					cards: {
						$set: mergeCards(state, action.payload)
					}
				})
			}
			case SET_CURRENT_USER:
				return update(state, {
					currentUser: {
						$set: action.payload.id
					},
					cards: {
						$set: mergeCards(state, [ action.payload ])
					}
				})

			default:
				return state
		}
	}
}
