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
import * as constants from '../../constants'
import * as redux from 'redux'
import {
	Button,
	Flex,
	Select,
	Txt
} from 'rendition'
import * as store from '../../core/store'
import * as helpers from '../../services/helpers'
import * as link from '../../services/link'
import {
	CloseButton
} from '../../shame/CloseButton'
import Column from '../../shame/Column'
import Icon from '../../shame/Icon'
import {
	Form
} from 'rendition/dist/unstable'
import * as skhema from 'skhema'
import {
	analytics,
	sdk
} from '../../core'
import AutoCompleteWidget from '../../components/AutoCompleteWidget'
import {
	FreeFieldForm
} from '../../components/FreeFieldForm'

const slugify = (value) => {
	return value
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')
}

class CreateLens extends React.Component {
	constructor (props) {
		super(props)

		const {
			types,
			seed
		} = this.props.channel.data.head

		this.state = {
			newCardModel: seed,
			selectedTypeTarget: _.first(_.castArray(types))
		}

		this.bindMethods([
			'addEntry',
			'close',
			'handleTypeTargetSelect',
			'handleFormChange',
			'setFreeFieldData',
			'setLocalSchema'
		])
	}

	bindMethods (methods) {
		methods.forEach((method) => {
			this[method] = this[method].bind(this)
		})
	}

	handleFormChange (data) {
		const {
			seed
		} = this.props.channel.data.head

		this.setState({
			newCardModel: Object.assign({}, seed, data.formData)
		})
	}

	setFreeFieldData (data) {
		const model = this.state.newCardModel
		_.forEach(data, (value, key) => {
			_.set(model, [ 'data', key ], value)
		})
		this.setState({
			newCardModel: model
		})
	}

	setLocalSchema (schema) {
		const model = this.state.newCardModel
		_.set(model, [ 'data', '$$localSchema' ], schema)
		this.setState({
			newCardModel: model
		})
	}

	addEntry () {
		const {
			selectedTypeTarget
		} = this.state
		if (!selectedTypeTarget) {
			return
		}
		const newCard = helpers.removeUndefinedArrayItems(_.merge({
			type: selectedTypeTarget.slug
		}, this.state.newCardModel))

		if (newCard.type === 'org' && newCard.name) {
			newCard.slug = `org-${slugify(newCard.name)}`
		}

		sdk.card.create(newCard)
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message)
			})
			.then((card) => {
				if (card) {
					analytics.track('element.create', {
						element: {
							type: card.type
						}
					})
				}
				this.handleDone(card || null)
			})
			.finally(() => {
				this.setState({
					submitting: false
				})
			})

		const {
			seed
		} = this.props.channel.data.head

		this.setState({
			submitting: true
		})
	}

	close () {
		this.props.actions.removeChannel(this.props.channel)
	}

	handleTypeTargetSelect (event) {
		const types = this.props.channel.data.head.types

		this.setState({
			selectedTypeTarget: _.find(_.castArray(types), {
				slug: event.target.value
			})
		})
	}

	handleDone (newCard) {
		const {
			onDone
		} = this.props.channel.data.head

		if (!onDone) {
			return
		}

		if (onDone.action === 'open') {
			this.props.actions.addChannel(helpers.createChannel({
				cardType: newCard.type,
				target: newCard.id
			}))

			this.close()

			return
		}

		if (onDone.action === 'link') {
			const card = onDone.target
			const {
				selectedTypeTarget
			} = this.state
			if (!newCard) {
				return
			}
			if (!selectedTypeTarget) {
				return
			}
			const linkName = constants.LINKS[card.type][selectedTypeTarget.slug]
			link.createLink(card, newCard, linkName)
			this.close()
		}
	}

	render () {
		const {
			selectedTypeTarget
		} = this.state

		const localSchema = helpers.getLocalSchema(this.state.newCardModel)

		const freeFieldData = _.reduce(localSchema.properties, (carry, _value, key) => {
			const cardValue = _.get(this.state.newCardModel, [ 'data', key ])
			if (cardValue) {
				carry[key] = cardValue
			}
			return carry
		}, {})

		// Omit known computed values from the schema
		const schema = _.omit(selectedTypeTarget.data.schema, [
			'properties.data.properties.mentionsUser',
			'properties.data.properties.alertsUser'
		])
		const uiSchema = _.get(schema, [ 'properties', 'name' ])
			? {
				'ui:order': [ 'name', 'tags', '*' ]
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

		// Always show tags input
		if (!schema.properties.tags) {
			_.set(schema, [ 'properties', 'tags' ], {
				type: 'array',
				items: {
					type: 'string'
				}
			})
		}

		const isValid = skhema.isValid(schema, helpers.removeUndefinedArrayItems(this.state.newCardModel)) &&
            skhema.isValid(localSchema, helpers.removeUndefinedArrayItems(freeFieldData))

		const types = this.props.channel.data.head.types

		return (
			<Column
				overflowY
				p={3}
			>
				<div>
					<Flex flex={0} align="start" justify="space-between">
						<h3>{`Add ${selectedTypeTarget.name}`}</h3>

						<CloseButton
							mb={3}
							mr={-3}
							onClick={this.close}
						/>
					</Flex>
					{_.isArray(types) && (
						<Flex align="center" pb={3}>
							<Txt>Create a new</Txt>

							<Select ml={2} value={selectedTypeTarget.slug} onChange={this.handleTypeTargetSelect}>
								{types.map((type) => {
									return (
										<option value={type.slug} key={type.slug}>
											{type.name || type.slug}
										</option>
									)
								})}
							</Select>
						</Flex>
					)}

					<Form
						uiSchema={uiSchema}
						schema={schema}
						value={this.state.newCardModel}
						onFormChange={this.handleFormChange}
						hideSubmitButton={true}
					/>

					<FreeFieldForm
						schema={localSchema}
						data={freeFieldData}
						onDataChange={this.setFreeFieldData}
						onSchemaChange={this.setLocalSchema}
					/>

					<Flex justify="flex-end" mt={4}>
						<Button
							onClick={this.close}
							mr={2}
						>
							Cancel
						</Button>
						<Button
							primary
							disabled={!isValid}
							onClick={this.addEntry}
							data-test="card-creator__submit"
						>
							{this.state.submitting ? <Icon name="cog fa-spin" /> : 'Submit' }
						</Button>
					</Flex>
				</div>
			</Column>
		)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(store.actionCreators, dispatch)
	}
}

export default {
	slug: 'lens-action-create',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		renderer: connect(null, mapDispatchToProps)(CreateLens),
		icon: 'address-card',
		type: '*'
	}
}
