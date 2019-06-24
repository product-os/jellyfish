/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import CardLayout from '../../layouts/CardLayout'

export default class Contact extends React.Component {
	render () {
		console.log('props', this.props)
		const {
			card,
			channel
		} = this.props

		return (
			<CardLayout
				card={card}
				channel={channel}
			/>
		)
	}
}
