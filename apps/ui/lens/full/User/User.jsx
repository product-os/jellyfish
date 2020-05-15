/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	ActionLink
} from '../../../../../lib/ui-components/shame/ActionLink'
import singleCardLens from '../SingleCard'

export default class User extends React.Component {
	constructor (props) {
		super(props)
		this.sendFirstTimeLoginLink = this.sendFirstTimeLoginLink.bind(this)

		this.state = {
			isOperator: _.includes(_.get(props, [ 'user', 'data', 'roles' ], []), 'user-operator')
		}
	}

	sendFirstTimeLoginLink () {
		const {
			card,
			actions
		} = this.props
		return actions.sendFirstTimeLoginLink({
			user: card
		})
	}

	render () {
		return (
			<singleCardLens.data.renderer
				{...this.props}
				actionItems={this.state.isOperator ? (
					<ActionLink
						onClick={this.sendFirstTimeLoginLink}
						data-test="card-action-menu__send-first-time-login"
					>
						Send first-time login link
					</ActionLink>
				) : null}
			/>
		)
	}
}
