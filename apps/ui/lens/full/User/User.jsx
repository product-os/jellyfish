/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	ActionLink
} from '@balena/jellyfish-ui-components/lib/shame/ActionLink'
import singleCardLens from '../SingleCard'
import {
	sdk
} from '../../../core'

export default class User extends React.Component {
	constructor (props) {
		super(props)
		this.sendFirstTimeLoginLink = this.sendFirstTimeLoginLink.bind(this)

		this.state = {
			isOperator: false
		}
	}

	componentDidMount () {
		return sdk.query({
			type: 'object',
			required: [ 'id', 'type', 'data' ],
			properties: {
				id: {
					const: this.props.user.id
				},
				type: {
					const: 'user@1.0.0'
				},
				data: {
					type: 'object',
					required: [ 'roles' ],
					properties: {
						roles: {
							type: 'array',
							items: 'string'
						}
					}
				}
			}
		}).then(([ userWithRoles ]) => {
			const roles = _.get(userWithRoles, [ 'data', 'roles' ])
			if (_.includes(roles, 'user-operator')) {
				console.log('here')
				this.setState({
					isOperator: true
				})
			}
		})
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
