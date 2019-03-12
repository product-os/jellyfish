/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const copy = require('copy-to-clipboard')
const _ = require('lodash')
const React = require('react')
const {
	connect
} = require('react-redux')
const redux = require('redux')
const rendition = require('rendition')
const unstable = require('rendition/dist/unstable')
const skhema = require('skhema')
const FreeFieldForm = require('../components/FreeFieldForm')
const core = require('../core')
const store = require('../core/store')
const helpers = require('../services/helpers')
const urlManager = require('../services/url-manager')
const CardLinker = require('./CardLinker')
const ContextMenu = require('./ContextMenu')
const ActionLink = require('../shame/ActionLink')
const Icon = require('../shame/Icon')
const IconButton = require('../shame/IconButton')
class Base extends React.Component {
	constructor (props) {
		super(props)
		this.delete = () => {
			core.sdk.card.remove(this.props.card.id, this.props.card.type)
				.catch((error) => {
					this.props.actions.addNotification('danger', error.message)
				})
			this.setState({
				showDeleteModal: false
			})
		}
		this.updateEntry = () => {
			const updatedEntry = helpers.removeUndefinedArrayItems(_.assign({}, this.props.card, this.state.editModel))
			const {
				id, type
			} = this.props.card
			core.sdk.card.update(id, updatedEntry)
				.then(() => {
					core.analytics.track('element.update', {
						element: {
							id,
							type
						}
					})
				})
				.catch((error) => {
					this.props.actions.addNotification('danger', error.message)
				})
			this.setState({
				showEditModal: false,
				editModel: {}
			})
		}
		this.edit = () => {
			this.setState({
				showEditModal: true,

				// Omit known immutable values
				editModel: _.omit(_.cloneDeep(this.props.card), [ 'id', 'slug' ])
			})
		}
		this.cancelEdit = () => {
			this.setState({
				showEditModal: false,
				editModel: {}
			})
		}
		this.copyPermalink = (event) => {
			event.preventDefault()
			event.stopPropagation()
			copy(urlManager.createPermaLink(this.props.card))
		}
		this.copyJSON = (event) => {
			event.preventDefault()
			event.stopPropagation()
			copy(JSON.stringify(this.props.card, null, 2))
		}
		this.toggleMenu = () => {
			this.setState({
				showMenu: !this.state.showMenu
			})
		}
		this.toggleDeleteModal = () => {
			this.setState({
				showDeleteModal: !this.state.showDeleteModal
			})
		}
		this.handleFormChange = (data) => {
			this.setState({
				editModel: data.formData
			})
		}
		this.setFreeFieldData = (data) => {
			const model = this.state.editModel
			_.forEach(data, (value, key) => {
				_.set(model, [ 'data', key ], value)
			})
			this.setState({
				editModel: model
			})
		}
		this.setLocalSchema = (schema) => {
			const model = this.state.editModel
			_.set(model, [ 'data', '$$localSchema' ], schema)
			this.setState({
				editModel: model
			})
		}
		const cardType = _.find(this.props.types, {
			slug: this.props.card.type
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
			showEditModal: false,
			showDeleteModal: false,
			showMenu: false,
			editModel: {},
			schema
		}
	}
	render () {
		const localSchema = helpers.getLocalSchema(this.state.editModel)
		const freeFieldData = _.reduce(localSchema.properties, (carry, _value, key) => {
			const cardValue = _.get(this.props.card, [ 'data', key ])
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
		const isValid = skhema.isValid(this.state.schema, helpers.removeUndefinedArrayItems(this.state.editModel)) &&
            skhema.isValid(localSchema, helpers.removeUndefinedArrayItems(freeFieldData))
		return (
			<React.Fragment>
				<rendition.Flex align="right" justify="flex-end">
					<IconButton.IconButton
						plaintext
						square={true}
						mr={1}
						onClick={this.edit}
						className="card-actions__btn--edit"
						tooltip={{
							placement: 'left',
							text: 'Edit this element'
						}}
					>
						<Icon.default name="pencil-alt"/>
					</IconButton.IconButton>

					<CardLinker.CardLinker types={this.props.types} card={this.props.card}/>

					<span>
						<IconButton.IconButton px={2} mr={-1} plaintext onClick={this.toggleMenu}>
							<Icon.default name="ellipsis-v"/>

						</IconButton.IconButton>

						{this.state.showMenu &&
							<ContextMenu.ContextMenu position="bottom" onClose={this.toggleMenu}>
								<React.Fragment>
									<ActionLink.ActionLink mb={2} onClick={this.copyPermalink} tooltip={{
										text: 'Permalink copied!',
										trigger: 'click'
									}}>
											Copy permalink
									</ActionLink.ActionLink>

									<ActionLink.ActionLink mb={2} onClick={this.copyJSON} tooltip={{
										text: 'JSON copied!',
										trigger: 'click'
									}}>
											Copy as JSON
									</ActionLink.ActionLink>

									<ActionLink.ActionLink onClick={this.toggleDeleteModal}>
											Delete
									</ActionLink.ActionLink>
								</React.Fragment>
							</ContextMenu.ContextMenu>}
					</span>

				</rendition.Flex>

				{this.state.showDeleteModal && (
					<rendition.Modal
						title="Are you sure you want to delete this item?"
						cancel={this.toggleDeleteModal}
						done={this.delete}
					/>
				)}

				{this.state.showEditModal && (
					<rendition.Modal w={1060} cancel={this.cancelEdit} done={this.updateEntry} primaryButtonProps={{
						className: 'card-edit-modal__submit',
						disabled: !isValid
					}}>
						<unstable.Form
							uiSchema={uiSchema}
							schema={this.state.schema}
							value={this.state.editModel}
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
				)}
			</React.Fragment>
		)
	}
}
const mapStateToProps = (state) => {
	return {
		types: store.selectors.getTypes(state)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(store.actionCreators, dispatch)
	}
}
exports.CardActions = connect(mapStateToProps, mapDispatchToProps)(Base)
