/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const _ = require('lodash')
const React = require('react')
const rendition = require('rendition')
const unstable = require('rendition/dist/unstable')
const core = require('../core')
const DELIMITER = '___'
class GroupUpdate extends React.Component {
	constructor (props) {
		super(props)
		this.setSchema = (schema) => {
			const flatSchema = rendition.SchemaSieve.flattenSchema(schema, DELIMITER)

			// Remove known metadata properties
			if (flatSchema.properties) {
				flatSchema.properties = _.omitBy(flatSchema.properties, (value) => {
					return _.includes([ 'alertsUser', 'mentionsUser', '$$localSchema' ], value.title)
				})
			}
			const selectedField = _.keys(flatSchema.properties).shift()
			this.setState({
				flatSchema,
				selectedField
			})
		}
		this.updateCards = () => {
			if (_.isEmpty(this.state.updateData)) {
				return
			}
			const flattenedKey = _.keys(this.state.updateData).shift()
			const keys = _.trimStart(flattenedKey, DELIMITER).split(DELIMITER)
			const update = {}
			_.set(update, keys, this.state.updateData[flattenedKey])
			this.setState({
				processing: true
			})
			const length = this.props.cards.length
			let processed = 0
			Bluebird.map(this.props.cards, ({
				id, type
			}) => {
				return core.sdk.card.update(id, update)
					.then(() => {
						core.analytics.track('element.update', {
							element: {
								id,
								type
							}
						})
						processed++
						this.setState({
							processingProgress: processed / length * 100
						})
					})
			}, {
				concurrency: 10
			})
				.then(() => {
					this.props.onClose()
				})
		}
		this.setUpdateData = (data) => {
			this.setState({
				updateData: {
					[this.state.selectedField]: data.formData[this.state.selectedField]
				}
			})
		}
		this.handleFieldChange = (event) => {
			this.setState({
				selectedField: event.target.value
			})
		}
		this.state = {
			updateData: {},
			processing: false,
			processingProgress: 0
		}
	}
	componentDidMount () {
		this.setSchema(this.props.schema)
	}
	render () {
		const {
			flatSchema, selectedField, updateData, processing, processingProgress
		} = this.state
		const {
			length
		} = this.props.cards
		return (
			<rendition.Fixed z={9} top right bottom left onClick={this.props.onClose}>
				<rendition.Modal
					title={`Updating ${length} item${length === 1 ? '' : 's'}`}
					cancel={this.props.onClose}
					done={this.updateCards}
					action="Update"
					primaryButtonProps={{
						disabled: _.isEmpty(updateData) || processing
					}}
				>
					{processing &&
							<React.Fragment>
								<p>Processing updates...</p>
								<rendition.ProgressBar primary value={processingProgress}/>
							</React.Fragment>}

					{!processing &&
							<React.Fragment>
								<p>Select a field to update:</p>

								{Boolean(flatSchema) &&
									<rendition.Select value={selectedField} onChange={this.handleFieldChange} mb={3}>
										{_.map(flatSchema.properties, (value, key) => {
											return (<option value={key}>{value.title || key}</option>)
										})}
									</rendition.Select>}

								{Boolean(flatSchema) && Boolean(selectedField) &&
									<unstable.Form schema={{
										type: 'object',
										properties: {
											[selectedField]: flatSchema.properties[selectedField]
										}
									}} hideSubmitButton value={updateData} onFormChange={this.setUpdateData}/>}
							</React.Fragment>}
				</rendition.Modal>
			</rendition.Fixed>
		)
	}
}
exports.GroupUpdate = GroupUpdate
