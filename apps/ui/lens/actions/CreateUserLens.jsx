/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	connect
} from 'react-redux'
import * as redux from 'redux'
import {
	Box,
	Button,
	Flex,
	Heading,
	Txt
} from 'rendition'
import * as helpers from '../../../../lib/ui-components/services/helpers'
import * as skhema from 'skhema'
import {
	Form
} from 'rendition/dist/unstable'
import Icon from '../../../../lib/ui-components/shame/Icon'
import CardLayout from '../../layouts/CardLayout'
import {
	actionCreators,
	sdk
} from '../../core'

class CreateUserLens extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			org: null,
			submitting: false,
			newCardModel: this.props.channel.data.head.seed
		}

		this.bindMethods([
			'close',
			'handleInputChange',
			'handleOnSubmit'
		])
	}

	bindMethods (methods) {
		methods.forEach((method) => {
			this[method] = this[method].bind(this)
		})
	}

	handleInputChange (data) {
		const {
			seed
		} = this.props.channel.data.head

		this.setState({
			newCardModel: Object.assign({}, seed, data.formData)
		})
	}

	handleOnSubmit (event) {
		event.preventDefault()
		const {
			org,
			newCardModel: {
				data
			}
		} = this.state

		const {
			actions,
			channel
		} = this.props

		this.setState({
			submitting: true
		}, async () => {
			const success = await actions.addUser({
				org,
				...data
			})
			this.setState({
				submitting: false
			})
			if (success) {
				await actions.removeChannel(channel)
			}
		})
	}

	close () {
		this.props.actions.removeChannel(this.props.channel)
	}

	componentDidMount () {
		const orgSlug = this.props.card.seed.markers[0]
		return sdk.getBySlug(orgSlug).then((org) => {
			this.setState({
				org
			})
		})
	}

	render () {
		const {
			org,
			newCardModel
		} = this.state

		const {
			card,
			channel
		} = this.props

		const schema = {
			type: 'object',
			required: [ 'data' ],
			properties: {
				data: {
					type: 'object',
					required: [ 'email', 'username' ],
					properties: {
						username: {
							type: 'string'
						},
						email: {
							type: 'string',
							format: 'email'
						}
					}
				}
			}
		}

		const newCardModelIsValid = skhema.isValid(schema, helpers.removeUndefinedArrayItems(newCardModel))

		return (
			<CardLayout
				noActions
				overflowY
				onClose={this.close}
				card={card}
				channel={channel}
				data-test="create-user-lens"
				title={(
					<Heading.h4>
						Add User
					</Heading.h4>
				)}
			>
				<Box px={3} pb={3}>
					<Form
						schema={schema}
						value={newCardModel}
						onFormChange={this.handleInputChange}
						hideSubmitButton={true}
					>
					</Form>
					<Txt mb={4}>
						On submit, your user will be created without a password.
						A first-time-login link is then sent to their email.
						New users can use this token to set their password and login
					</Txt>
					<Flex justifyContent="flex-end" mt={4}>
						<Button
							onClick={this.close}
							mr={2}
						>
							Cancel
						</Button>
						<Button
							primary={true}
							type="submit"
							onClick={this.handleOnSubmit}
							disabled={!newCardModelIsValid || !org}
							data-test="card-creator__submit"
						>
							{this.state.submitting ? <Icon spin name="cog"/> : 'Submit' }
						</Button>
					</Flex>
				</Box>
			</CardLayout>
		)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'removeChannel',
				'addUser'
			]),
			dispatch
		)
	}
}

export default {
	slug: 'lens-action-create-user',
	type: 'lens',
	version: '1.0.0',
	name: 'Create user lens',
	data: {
		renderer: connect(null, mapDispatchToProps)(CreateUserLens),
		icon: 'address-card',
		type: '*',
		action: {
			type: 'string',
			const: 'create'
		}
	}
}
