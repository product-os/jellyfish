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

const FORM_SCHEMA = {
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

// TODO autogenerate this based on user creation action card
class CreateUserLens extends React.Component {
	constructor (props) {
		super(props)

		const {
			actions,
			user
		} = this.props

		const orgs = _.filter(_.get(user, [ 'links', 'is member of' ], []), {
			type: 'org@1.0.0'
		})

		if (!orgs.length) {
			actions.addNotification('danger', 'You must belong to an organisation to add new users')
		}

		const formSchema = _.set(_.clone(FORM_SCHEMA), [ 'properties', 'organisation' ], {
			type: 'string',
			anyOf: _.map(orgs, (org) => {
				return {
					title: org.name,
					const: org.slug
				}
			}).concat({
				title: 'No organisation',
				const: null
			})
		})

		this.state = {
			orgs,
			submitting: false,
			formData: {},
			cardIsValid: false,
			formSchema
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

	handleInputChange ({
		formData
	}) {
		const {
			formSchema
		} = this.state
		this.setState({
			formData,
			cardIsValid: skhema.isValid(formSchema, helpers.removeUndefinedArrayItems(formData))
		})
	}

	handleOnSubmit (event) {
		event.preventDefault()

		const {
			formData,
			orgs
		} = this.state

		const {
			actions
		} = this.props

		this.setState({
			submitting: true
		}, async () => {
			const success = await actions.addUser({
				username: formData.username,
				email: formData.email,
				org: _.find(orgs, {
					slug: formData.organisation
				})
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

	render () {
		const {
			orgs,
			formData,
			cardIsValid,
			formSchema
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
						schema={formSchema}
						value={formData}
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
							disabled={!cardIsValid || !orgs.length}
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
