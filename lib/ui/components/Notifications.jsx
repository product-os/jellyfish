/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const React = require('react')
const {
	connect
} = require('react-redux')
const redux = require('redux')
const rendition = require('rendition')
const styledComponents = require('styled-components')
const {
	actionCreators,
	selectors
} = require('../core')
const MessageText = styledComponents.default.span `
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
			<rendition.Alert
				key={id}
				mb={2}
				success={type === 'success'}
				danger={type === 'danger'}
				warning={type === 'warning'}
				info={type === 'info'}
				data-id={id}
				data-test={`alert--${type}`}
				onDismiss={this.dismiss}
			>
				<MessageText>{_.isString(message) ? message : JSON.stringify(message)}</MessageText>
			</rendition.Alert>
		)
	}
}
class Base extends React.Component {
	constructor (props) {
		super(props)
		this.remove = (id) => {
			this.props.actions.removeNotification(id)
		}
	}
	render () {
		if (!this.props.notifications.length) {
			return null
		}
		return (<rendition.Fixed top={true} left={true} right={true}>
			<rendition.Box m={3} style={{
				opacity: 0.95
			}}>
				{this.props.notifications.map(({
					type, id, message
				}) => {
					return (<JellyFishAlert key={id} id={id} type={type} message={message} onDismiss={this.remove}/>)
				})}
			</rendition.Box>
		</rendition.Fixed>)
	}
}
const mapStateToProps = (state) => {
	return {
		notifications: selectors.getNotifications(state)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(actionCreators, dispatch)
	}
}
exports.Notifications = connect(mapStateToProps, mapDispatchToProps)(Base)
