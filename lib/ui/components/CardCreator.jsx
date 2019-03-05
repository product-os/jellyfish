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
const unstable = require('rendition/dist/unstable')
const skhema = require('skhema')
const core = require('../core')
const store = require('../core/store')
const helpers = require('../services/helpers')
const FreeFieldForm = require('./FreeFieldForm')
const slugify = (value) => {
	return value
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')
}
class Base extends React.Component {
	constructor (props) {
		super(props)
		this.addEntry = () => {
			const {
				selectedTypeTarget
			} = this.state
			if (!selectedTypeTarget) {
				return
			}
			const newCard = helpers.removeUndefinedArrayItems(_.merge({
				type: selectedTypeTarget.slug
			}, this.state.newCardModel))
			if (this.props.onCreate) {
				this.props.onCreate()
			}
			if (newCard.type === 'org' && newCard.name) {
				newCard.slug = `org-${slugify(newCard.name)}`
			}
			core.sdk.card.create(newCard)
				.catch((error) => {
					this.props.done(null)
					this.props.actions.addNotification('danger', error.message)
				})
				.then((card) => {
					if (card) {
						core.analytics.track('element.create', {
							element: {
								type: card.type
							}
						})
					}
					this.props.done(card || null)
				})
			this.setState({
				newCardModel: this.props.seed
			})
		}
		this.handleFormChange = (data) => {
			this.setState({
				newCardModel: data.formData
			})
		}
		this.setFreeFieldData = (data) => {
			const model = this.state.newCardModel
			_.forEach(data, (value, key) => {
				_.set(model, [ 'data', key ], value)
			})
			this.setState({
				newCardModel: model
			})
		}
		this.setLocalSchema = (schema) => {
			const model = this.state.newCardModel
			_.set(model, [ 'data', '$$localSchema' ], schema)
			this.setState({
				newCardModel: model
			})
		}
		this.handleTypeTargetSelect = (event) => {
			this.setState({
				selectedTypeTarget: _.find(_.castArray(this.props.type), {
					slug: event.target.value
				})
			})
		}
		this.state = {
			newCardModel: this.props.seed,
			selectedTypeTarget: _.isArray(this.props.type) ? _.first(this.props.type) : this.props.type
		}
	}
	render () {
		const {
			selectedTypeTarget
		} = this.state
		if (!this.props.show) {
			return null
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
				'ui:order': [ 'name', '*' ]
			}
			: {}
		const isValid = skhema.isValid(schema, helpers.removeUndefinedArrayItems(this.state.newCardModel)) &&
            skhema.isValid(localSchema, helpers.removeUndefinedArrayItems(freeFieldData))
		return (
			<rendition.Modal
				w={1060}
				title={`Add ${selectedTypeTarget.name}`}
				cancel={this.props.cancel}
				done={this.addEntry}
				primaryButtonProps={{
					className: 'card-create-modal__submit',
					disabled: !isValid
				}}
			>
				{_.isArray(this.props.type) && (
					<rendition.Flex align="center" pb={3}>
						<rendition.Txt>Create a new</rendition.Txt>

						<rendition.Select ml={2} value={selectedTypeTarget.slug} onChange={this.handleTypeTargetSelect}>
							{this.props.type.map((type) => {
								return (<option value={type.slug} key={type.slug}>
									{type.name || type.slug}
								</option>)
							})}
						</rendition.Select>
					</rendition.Flex>
				)}

				<unstable.Form
					uiSchema={uiSchema}
					schema={schema}
					value={this.state.newCardModel}
					onFormChange={this.handleFormChange}
					hideSubmitButton={true}
				/>

				<FreeFieldForm.FreeFieldForm
					schema={localSchema}
					data={freeFieldData}
					onDataChange={this.setFreeFieldData}
					onSchemaChange={this.setLocalSchema}
				/>
			</rendition.Modal>
		)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(store.actionCreators, dispatch)
	}
}
exports.CardCreator = connect(null, mapDispatchToProps)(Base)
