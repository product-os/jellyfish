/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	patchPath
} from '../../../../lib/ui-components/services/helpers.js'
import {
	useSetup
} from '../../../../lib/ui-components/SetupProvider'

export default function withCardUpdater (BaseComponent) {
	return ({
		actions: {
			addNotification
		}, ...props
	}) => {
		const {
			sdk,
			analytics
		} = useSetup()
		const onUpdateCard = (card, patchKeyPath, newValue) => {
			const patch = patchPath(card, patchKeyPath, newValue)

			if (patch.length) {
				sdk.card.update(card.id, card.type, patch)
					.then(() => {
						analytics.track('element.update', {
							element: {
								id: card.id,
								type: card.type
							}
						})
					})
					.then(() => {
						addNotification('success', `Updated ${card.name} to ${newValue}`)
					})
					.catch((error) => {
						console.log(error, error.message)
						addNotification('danger', error.message || error)
					})
			}
		}
		return <BaseComponent {...props} onUpdateCard={onUpdateCard} />
	}
}
