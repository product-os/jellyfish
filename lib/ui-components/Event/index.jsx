/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	compose
} from 'redux'
import Event from './Event'
import {
	getMessage
} from './EventBody'
import CardLoader from '../CardLoader'
import * as helpers from '../services/helpers'
import withCardUpdater from '../HOC/with-card-updater'
import {
	withSetup
} from '../SetupProvider'

export {
	getMessage
}

const EventWithActor = (props) => {
	return (
		<CardLoader
			id={helpers.getActorIdFromCard(props.card)}
			type="user"
			withLinks={[ 'is member of' ]}
			cardSelector={props.selectCard}
			getCard={props.getCard}
		>
			{(author) => {
				return (
					<Event {...props} actor={helpers.generateActorFromUserCard(author)} />
				)
			}}
		</CardLoader>
	)
}

export default compose(
	withSetup,
	withCardUpdater(true)
)(EventWithActor)
