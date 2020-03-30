/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import clone from 'deep-copy'
import * as _ from 'lodash'
import Bluebird from 'bluebird'
import React from 'react'
import update from 'immutability-helper'
import {
	connect
} from 'react-redux'
import {
	Redirect
} from 'react-router-dom'
import * as redux from 'redux'
import {
	Box,
	Button,
	Card,
	Flex,
	Heading,
	Input,
	Select,
	Txt
} from 'rendition'
import * as helpers from '../../../../lib/ui-components/services/helpers'
import Icon from '../../../../lib/ui-components/shame/Icon'
import CardLayout from '../../layouts/CardLayout'
import * as skhema from 'skhema'
import {
	actionCreators,
	analytics,
	constants,
	sdk,
	selectors
} from '../../core'
import AutoCompleteWidget from '../../../../lib/ui-components/AutoCompleteWidget'
import Segment from '../full/SingleCard/Segment'

// 'Draft' links are stored in a map in the component's state,
// keyed by the combination of the target card type and the link verb.
const getLinkKey = (targetCardType, linkVerb) => {
	return `${targetCardType.split('@')[0]}-${helpers.slugify(linkVerb)}`
}

class CreateUserLens extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			email: '',
			username: '',
			submitting: false
		}

		this.bindMethods([
			'addUser',
			'close',
			'handleInputChange',
			'addUser'
		])
	}

	bindMethods (methods) {
		methods.forEach((method) => {
			this[method] = this[method].bind(this)
		})
	}

	handleInputChange (event){
		this.setState({
			[event.target.name]: event.target.value
		})
	}

	addUser (event) {
		event.preventDefault()
		const {
			username,
			email
		} = this.state

		const {
			actions
		} = this.props

		this.setState({
			submitting: true
		})

		return sdk.auth.signup({ username, email, password: '' })
			.then((user) => {
				console.log(actions)
			})
			.catch((err) => {
				console.log(err)
			})
	}

	close () {
		this.props.actions.removeChannel(this.props.channel)
	}

	render () {
		const {
			redirectTo,
			email,
			username
		} = this.state

		const {
			card,
			channel
		} = this.props

		if (redirectTo) {
			return <Redirect push to={redirectTo} />
		}

		return (
			<CardLayout
				noActions
				overflowY
				onClose={this.close}
				card={card}
				channel={channel}
				data-test="create-lens"
				title={(
					<Heading.h4>
						Add User
					</Heading.h4>
				)}
			>
				<Box px={3} pb={3}>
					<form
						onSubmit={this.addUser}
					>
						<Txt fontSize={1} mb={1}>Username</Txt>
						<Input
							name="username"
							mb={3}
							value={username}
							placeholder={username}
							onChange={this.handleInputChange}
						/>
						<Txt fontSize={1} mb={1}>Email</Txt>
						<Input
							name="email"
							mb={3}
							value={email}
							placeholder={email}
							onChange={this.handleInputChange}
						/>

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
								disabled={email === '' || username === ''}
								data-test="card-creator__submit"
							>
								{this.state.submitting ? <Icon spin name="cog"/> : 'Submit' }
							</Button>
						</Flex>
					</form>
				</Box>
			</CardLayout>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		allTypes: selectors.getTypes(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'addNotification',
				'createLink',
				'removeChannel',
				'getLinks',
				'queryAPI'
			]),
			dispatch
		)
	}
}

export default {
	slug: 'lens-action-create',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		renderer: connect(mapStateToProps, mapDispatchToProps)(CreateUserLens),
		icon: 'address-card',
		type: '*',
		action: {
			type: 'string',
			const: 'create'
		}
	}
}
