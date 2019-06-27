/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import {
	Alert,
	Box,
	Fixed
} from 'rendition'
import styled from 'styled-components'
import {
	actionCreators,
	selectors
} from '../core'

const MessageText = styled.span `
	white-space: pre;
`
class JellyFishAlert extends React.Component {
	constructor (props) {
		super(props)

		this.dismiss = () => {
			this.props.onDismiss(this.props.id)
		}
	}

	render () {
		const {
			id, type, message
		} = this.props
		return (
			<Alert
				key={id}
				mb={2}
				success={type === 'success'}
				danger={type === 'danger'}
				warning={type === 'warning'}
				info={type === 'info'}
				data-id={id}
				data-test={`alert--${type}`}
				onDismiss={this.dismiss}
				prefix={false}
			>
				<MessageText>
					{_.isString(message) ? message : JSON.stringify(message)}
				</MessageText>
			</Alert>
		)
	}
}

class Notifications extends React.Component {
	constructor (props) {
		super(props)

		this.remove = (id) => {
			this.props.actions.removeNotification(id)
		}
	}

	render () {
		const {
			notifications
		} = this.props

		if (!notifications.length) {
			return null
		}

		return (
			<Fixed
				left
				bottom
				pb={3}
				width={350}
			>
				<Box
					m={3}
					style={{
						opacity: 0.95
					}}
				>
					{notifications.map(({
						type, id, message
					}) => {
						return (
							<JellyFishAlert
								key={id}
								id={id}
								type={type}
								message={message}
								onDismiss={this.remove}
							/>
						)
					})}
				</Box>
			</Fixed>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		notifications: selectors.getNotifications(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(actionCreators, dispatch)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Notifications)
