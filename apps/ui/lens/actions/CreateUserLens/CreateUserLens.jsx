/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Box,
	Button,
	Flex,
	Heading,
	Txt
} from 'rendition'
import * as helpers from '../../../../../lib/ui-components/services/helpers'
import * as skhema from 'skhema'
import {
	Form
} from 'rendition/dist/unstable'
import Icon from '../../../../../lib/ui-components/shame/Icon'
import CardLayout from '../../../layouts/CardLayout'
import {
	sdk
} from '../../../core'

const SCHEMA = {
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

class CreateUserLens extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			org: null,
			submitting: false,
			newCard: this.props.channel.data.head.seed,
			cardIsValid: false
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
		const newCard = Object.assign({}, seed, data.formData)
		this.setState({
			newCard,
			cardIsValid: skhema.isValid(SCHEMA, helpers.removeUndefinedArrayItems(newCard))
		})
	}

	handleOnSubmit (event) {
		event.preventDefault()
		const {
			org,
			newCard: {
				data
			}
		} = this.state

		const {
			actions
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
				this.close()
			}
		})
	}

	close () {
		this.props.actions.removeChannel(this.props.channel)
	}

	componentDidMount () {
		const {
			card,
			actions
		} = this.props
		const markers = card.seed.markers
		const orgSlug = _.find(markers, (marker) => {
			const match = marker.search(/org-[a-z-]*/)
			return match === 0
		})
		if (orgSlug) {
			sdk.getBySlug(orgSlug).then((org) => {
				if (org) {
					this.setState({
						org
					})
				} else {
					actions.addNotification('danger', 'Could not find your organisation')
				}
			})
		} else {
			actions.addNotification('danger', 'You must belong to an organisation to add new users')
		}
	}

	render () {
		const {
			org,
			newCard,
			cardIsValid
		} = this.state

		const {
			card,
			channel
		} = this.props

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
						schema={SCHEMA}
						value={newCard}
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
						>
							Cancel
						</Button>
						<Button
							primary
							type="submit"
							onClick={this.handleOnSubmit}
							disabled={!cardIsValid || !org}
							data-test="create-user-lens__submit"
						>
							{this.state.submitting ? <Icon spin name="cog"/> : 'Submit' }
						</Button>
					</Flex>
				</Box>
			</CardLayout>
		)
	}
}

export default CreateUserLens
