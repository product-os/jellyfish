/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import clone from 'deep-copy'
import * as _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import * as redux from 'redux'
import {
	Button,
	Flex
} from 'rendition'
import {
	Form
} from 'rendition/dist/unstable'
import * as helpers from '../../services/helpers'
import {
	CloseButton
} from '../../shame/CloseButton'
import Column from '../../shame/Column'
import * as skhema from 'skhema'
import {
	actionCreators,
	analytics,
	sdk
} from '../../core'
import AutoCompleteWidget from '../../components/AutoCompleteWidget'
import {
	FreeFieldForm
} from '../../components/FreeFieldForm'

class EditLens extends React.Component {
	constructor (props) {
		super(props)

		const {
			types,
			card
		} = this.props.channel.data.head

		const cardType = _.find(types, {
			slug: card.type
		})

		// Omit known computed values from the schema
		const schema = _.omit(cardType ? cardType.data.schema : {}, [
			'properties.data.properties.mentionsUser',
			'properties.data.properties.alertsUser',

			// Omit user password object
			// TODO: replace this with dynamic comparison against user permissions
			// see: https://github.com/resin-io/jellyfish/issues/390
			'properties.data.properties.password'
		])
		this.state = {
			// Omit known immutable values
			editModel: _.omit(clone(card), [ 'id', 'slug' ]),
			schema
		}

		this.updateEntry = this.updateEntry.bind(this)
		this.setFreeFieldData = this.setFreeFieldData.bind(this)
		this.setLocalSchema = this.setLocalSchema.bind(this)
		this.close = this.close.bind(this)

		this.handleFormChange = _.debounce(this.handleFormChange.bind(this), 500)
	}

	close () {
		this.props.actions.removeChannel(this.props.channel)
	}

	updateEntry () {
		const {
			card,
			onDone
		} = this.props.channel.data.head

		const updatedEntry = helpers.removeUndefinedArrayItems(_.assign({}, card, this.state.editModel))
		const {
			id, type
		} = card

		sdk.card.update(id, updatedEntry)
			.then(() => {
				analytics.track('element.update', {
					element: {
						id,
						type
					}
				})
			})
			.then(() => {
				this.props.actions.addNotification('success', 'Successfully updated card')
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message)
			})

		if (onDone.action === 'close') {
			this.close()
		}
	}

	handleFormChange (data) {
		this.setState({
			editModel: data.formData
		})
	}

	setFreeFieldData (data) {
		const model = this.state.editModel
		_.forEach(data, (value, key) => {
			_.set(model, [ 'data', key ], value)
		})
		this.setState({
			editModel: model
		})
	}

	setLocalSchema (schema) {
		const model = this.state.editModel
		_.set(model, [ 'data', '$$localSchema' ], schema)
		this.setState({
			editModel: model
		})
	}

	render () {
		const localSchema = helpers.getLocalSchema(this.state.editModel)
		const {
			card
		} = this.props.channel.data.head
		const freeFieldData = _.reduce(localSchema.properties, (carry, _value, key) => {
			const cardValue = _.get(card, [ 'data', key ])
			if (cardValue) {
				carry[key] = cardValue
			}
			return carry
		}, {})
		const uiSchema = _.get(this.state.schema, [ 'properties', 'name' ])
			? {
				'ui:order': [ 'name', '*' ]
			}
			: {}

		// Add autocompletion for the repository field
		_.set(uiSchema, [ 'data', 'repository' ], {
			'ui:widget': AutoCompleteWidget,
			'ui:options': {
				resource: 'issue',
				keyPath: 'data.repository'
			}
		})

		const schema = this.state.schema

		// Always show tags input
		if (!schema.properties.tags) {
			_.set(schema, [ 'properties', 'tags' ], {
				type: 'array',
				items: {
					type: 'string'
				}
			})
		}

		const isValid = skhema.isValid(this.state.schema, helpers.removeUndefinedArrayItems(this.state.editModel)) &&
            skhema.isValid(localSchema, helpers.removeUndefinedArrayItems(freeFieldData))
		return (
			<Column
				overflowY
				p={3}
			>
				<Flex py={2} flex={0} align="start" justifyContent="flex-end">
					<CloseButton
						onClick={this.close}
					/>
				</Flex>

				<Form
					uiSchema={uiSchema}
					schema={schema}
					value={this.state.editModel}
					onFormChange={this.handleFormChange}
					hideSubmitButton={true}
				/>

				<FreeFieldForm
					schema={localSchema}
					data={freeFieldData}
					onDataChange={this.setFreeFieldData}
					onSchemaChange={this.setLocalSchema}
				/>

				<Flex justifyContent="flex-end" mt={4}>
					<Button
						onClick={this.close}
						mr={2}
					>
						Cancel
					</Button>

					<Button
						primary
						disabled={!isValid}
						onClick={this.updateEntry}
						data-test="card-edit__submit"
					>
						Submit
					</Button>
				</Flex>
			</Column>
		)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'addNotification',
				'removeChannel'
			]),
			dispatch
		)
	}
}

export default {
	slug: 'lens-action-edit',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		renderer: connect(null, mapDispatchToProps)(EditLens),
		icon: 'pencil',
		type: '*'
	}
}
