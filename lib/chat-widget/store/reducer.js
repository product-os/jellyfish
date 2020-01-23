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

export const createReducer = ({
	product,
	productTitle
}) => {
	const initialState = {
		product,
		productTitle,
		cards: [],
		currentUser: null
	}

	return (state = initialState, action) => {
		switch (action.type) {
			case SET_CARDS:
				return update(state, {
					cards: {
						$apply: (cards) => {
							return _.unionBy(action.payload, cards, 'id')
						}
					}
				})
			case SET_CURRENT_USER:
				return update(state, {
					currentUser: {
						$set: action.payload.id
					},
					cards: {
						$apply: (cards) => {
							return _.unionBy([ action.payload ], cards, 'id')
						}
					}
				})

			default:
				return state
		}
	}
}
