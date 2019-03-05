/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const React = require('react')
const rendition = require('rendition')
const unstable = require('rendition/dist/unstable')
const notificationSettingsSchema = {
	type: 'object',
	properties: {
		web: {
			title: 'Web',
			description: 'Alert me with desktop notifications',
			type: 'object',
			properties: {
				update: {
					title: 'On update',
					description: 'When new content is added',
					type: 'boolean'
				},
				mention: {
					title: 'On mention',
					description: 'When I am mentioned',
					type: 'boolean'
				},
				alert: {
					title: 'On alert',
					description: 'When I am alerted',
					type: 'boolean'
				}
			},
			additionalProperties: false
		}
	}
}
class NotificationsModal extends React.Component {
	constructor (props) {
		super(props)
		this.done = () => {
			this.props.onDone(this.state.settings || {})
		}
		this.handleFormChange = (data) => {
			this.setState({
				settings: data.formData
			})
		}
		this.state = {
			settings: null
		}
	}
	componentWillReceiveProps (nextProps) {
		if (!_.isEqual(nextProps.settings, this.props.settings)) {
			this.setState({
				settings: nextProps.settings || {}
			})
		}
	}
	render () {
		if (!this.props.show) {
			return null
		}
		return (<rendition.Modal title="View settings" cancel={this.props.onCancel} done={this.done}>
			<unstable.Form
				schema={notificationSettingsSchema}
				value={this.state.settings}
				onFormChange={this.handleFormChange}
				onFormSubmit={this.done}
				hideSubmitButton={true}
			/>
		</rendition.Modal>)
	}
}
exports.NotificationsModal = NotificationsModal
