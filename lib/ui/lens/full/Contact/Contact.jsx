/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React from 'react'
import {
	Box
} from 'rendition'
import CardLayout from '../../../layouts/CardLayout'
import CardFields from '../../../components/CardFields'

export default class Contact extends React.Component {
	render () {
		const {
			card,
			channel,
			fieldOrder
		} = this.props
		const typeCard = _.find(this.props.types, {
			slug: card.type
		})

		return (
			<CardLayout
				card={card}
				channel={channel}
			>
				<Box p={3}>
					<CardFields
						card={card}
						fieldOrder={fieldOrder}
						type={typeCard}
					/>
				</Box>
			</CardLayout>
		)
	}
}
