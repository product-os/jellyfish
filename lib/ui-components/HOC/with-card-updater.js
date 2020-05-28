/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	patchPath
} from '../services/helpers.js'
import {
	useSetup
} from '../SetupProvider'

export default function withCardUpdater (skipNotification = false) {
	return (BaseComponent) => {
		return ({
			actions, ...props
		}) => {
			const {
				sdk,
				analytics
			} = useSetup()
			const onUpdateCard = (card, patchKeyPath, newValue) => {
				const patch = patchPath(card, patchKeyPath, newValue)

				if (patch.length) {
					return sdk.card.update(card.id, card.type, patch)
						.then((response) => {
							analytics.track('element.update', {
								element: {
									id: card.id,
									type: card.type
								}
							})
							return response
						})
						.then((response) => {
							if (!skipNotification) {
								actions.addNotification('success', `Updated ${card.name || card.slug} to ${newValue}`)
							}
							return response
						})
						.catch((error) => {
							console.log(error, error.message)
							actions.addNotification('danger', error.message || error)
						})
				}
				return null
			}
			return <BaseComponent {...props} actions={actions} onUpdateCard={onUpdateCard} />
		}
	}
}
