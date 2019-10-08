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
import {
	Redirect
} from 'react-router-dom'
import * as redux from 'redux'
import {
	Box,
	Button,
	Flex,
	Heading,
	Select,
	Txt
} from 'rendition'
import * as helpers from '../../services/helpers'
import Icon from 'ui-components/shame/Icon'
import CardLayout from '../../layouts/CardLayout'
import {
	Form
} from 'rendition/dist/unstable'
import * as skhema from 'skhema'
import {
	actionCreators,
	analytics,
	constants,
	sdk,
	selectors
} from '../../core'
import AutoCompleteWidget from '../../../../lib/ui-components/AutoCompleteWidget'
import FreeFieldForm from '../../../../lib/ui-components/FreeFieldForm'

class CreateLens extends React.Component {
	constructor (props) {
		super(props)

		const {
			types,
			seed,
			onDone
		} = this.props.channel.data.head
		const {
			allTypes
		} = this.props

		let selectedTypeTarget = null
		let linkOption = null

		if (onDone && onDone.action === 'link') {
			linkOption = _.find(constants.LINKS, {
				data: {
					from: onDone.target.type
				}
			})

			selectedTypeTarget = _.find(allTypes, {
				slug: linkOption.data.to
			})
		} else {
			selectedTypeTarget = _.first(_.castArray(types))
		}

		this.state = {
			newCardModel: seed,
			selectedTypeTarget,
			linkOption
		}

		this.bindMethods([
			'addEntry',
			'close',
			'handlLinkOptionSelect',
			'handleFormChange',
			'setFreeFieldData',
			'setLocalSchema'
		])

		this.handleFormChange = _.debounce(this.handleFormChange, 500)
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
			newCard.slug = `org-${helpers.slugify(newCard.name)}`
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

		this.setState({
			submitting: true
		})
	}

	close () {
		this.props.actions.removeChannel(this.props.channel)
	}

	handlLinkOptionSelect (payload) {
		const option = payload.value
		const selectedTypeTarget = _.find(this.props.allTypes, {
			slug: option.data.to
		})

		this.setState({
			selectedTypeTarget,
			linkOption: option
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
			this.setState({
				redirectTo: `/${newCard.slug || newCard.id}`
			})

			return
		}

		if (onDone.action === 'link') {
			const card = onDone.target
			const {
				linkOption,
				selectedTypeTarget
			} = this.state
			if (!newCard) {
				return
			}
			if (!selectedTypeTarget) {
				return
			}
			this.props.actions.createLink(card, newCard, linkOption.name)
			this.close()
		}
	}

	render () {
		const {
			redirectTo,
			selectedTypeTarget,
			linkOption
		} = this.state

		const {
			card,
			channel
		} = this.props

		if (redirectTo) {
			return <Redirect push to={redirectTo} />
		}

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

		const head = this.props.channel.data.head

		let linkTypeTargets = null

		if (linkOption) {
			const target = head.onDone.target

			// Create an array of available link types, then map over them and move the
			// data.title file to the root of the object, as the rendition Select
			// component can't use a non-root field for the `labelKey` prop
			// TODO make the Select component allow nested fields for the `labelKey` prop
			linkTypeTargets = _.filter(constants.LINKS, [ 'data.from', target.type ])
				.map((constraint) => {
					return Object.assign({}, constraint, {
						title: constraint.data.title
					})
				})
		}

		return (
			<CardLayout
				noActions
				overflowY
				onClose={this.close}
				card={card}
				channel={channel}
				title={(
					<Heading.h4>
						Add {linkOption ? linkOption.data.title : selectedTypeTarget.name}
					</Heading.h4>
				)}
			>
				<Box px={3} pb={3}>
					{Boolean(linkOption) && (
						<Flex alignItems="center" pb={3}>
							<Txt>Create a new</Txt>

							<Select
								ml={2}
								value={linkOption.data.title}
								onChange={this.handlLinkOptionSelect}
								options={linkTypeTargets}
								labelKey="title"
							/>
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
							onClick={this.addEntry}
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
				'removeChannel'
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
		renderer: connect(mapStateToProps, mapDispatchToProps)(CreateLens),
		icon: 'address-card',
		type: '*'
	}
}
