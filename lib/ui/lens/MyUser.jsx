/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import * as redux from 'redux'
import {
	Box,
	Flex,
	Heading,
	Select
} from 'rendition'
import {
	actionCreators,
	selectors
} from '../core'
import Column from '../shame/Column'
import {
	CloseButton
} from '../shame/CloseButton'
import Gravatar from '../shame/Gravatar'
import Icon from '../shame/Icon'

const SLUG = 'lens-my-user'

class MyUser extends React.Component {
	constructor (props) {
		super(props)

		this.handleSendCommandChange = this.handleSendCommandChange.bind(this)

		this.close = () => {
			this.props.actions.removeChannel(this.props.channel)
		}

		this.state = {
			updatingSendCommand: false
		}
	}

	async handleSendCommandChange (event) {
		const command = event.target.value

		this.setState({
			updatingSendCommand: true
		})

		await this.props.actions.setSendCommand(command)

		this.setState({
			updatingSendCommand: false
		})
	}

	render () {
		const user = this.props.card
		const sendCommand = _.get(user.data, [ 'profile', 'sendCommand' ], 'shift+enter')
		const userType = _.find(this.props.types, {
			slug: 'user'
		})
		const sendOptions = userType.data.schema.properties.data.properties.profile.properties.sendCommand.enum

		return (
			<Column data-test={`lens--${SLUG}`}>
				<Box
					p={3}
				>
					<Flex justifyContent="space-between" mb={3}>
						<Heading.h3>
							Account
						</Heading.h3>

						<Flex align="center">
							<CloseButton
								ml={3}
								onClick={this.close}
							/>
						</Flex>
					</Flex>

					<Flex mb={3}>
						<Gravatar.default email={user.data.email}/>

						<Box ml={2}>
							<strong>{user.slug.replace('user-', '')}</strong>

							<br />
							<strong>{user.data.email}</strong>
						</Box>
					</Flex>

					<Box>
						<label>
							Command to send messages:
						</label>

						<br/>

						<Select
							data-test={`${SLUG}__send-command-select`}
							mr={3}
							value={sendCommand}
							onChange={this.handleSendCommandChange}
							disabled={this.state.updatingSendCommand}
						>
							{_.map(sendOptions, (value) => {
								return (
									<option key={value}>{value}</option>
								)
							})}
						</Select>

						{this.state.updatingSendCommand && (
							<Icon spin name="cog" />
						)}
					</Box>
				</Box>
			</Column>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(actionCreators, dispatch)
	}
}

export default {
	slug: SLUG,
	type: 'lens',
	version: '1.0.0',
	name: 'Support thread lens',
	data: {
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(MyUser),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'user'
				},
				slug: {
					type: 'string',
					const: {
						$eval: 'user.slug'
					}
				}
			}
		}
	}
}
