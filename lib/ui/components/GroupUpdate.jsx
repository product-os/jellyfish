/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import Bluebird from 'bluebird'
import _ from 'lodash'
import React from 'react'
import {
	Fixed,
	Modal,
	ProgressBar,
	SchemaSieve,
	Select
} from 'rendition'
import {
	Form
} from 'rendition/dist/unstable'
import {
	analytics,
	sdk
} from '../core'

const DELIMITER = '___'

export default class GroupUpdate extends React.Component {
	constructor (props) {
		super(props)
		this.setSchema = (schema) => {
			const flatSchema = SchemaSieve.flattenSchema(schema, DELIMITER)

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
				return sdk.card.update(id, update)
					.then(() => {
						analytics.track('element.update', {
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
			<Fixed z={9} top right bottom left onClick={this.props.onClose}>
				<Modal
					title={`Updating ${length} item${length === 1 ? '' : 's'}`}
					cancel={this.props.onClose}
					done={this.updateCards}
					action="Update"
					primaryButtonProps={{
						disabled: _.isEmpty(updateData) || processing
					}}
				>
					{processing && (
						<React.Fragment>
							<p>Processing updates...</p>
							<ProgressBar primary value={processingProgress}/>
						</React.Fragment>
					)}

					{!processing && (
						<React.Fragment>
							<p>Select a field to update:</p>

							{Boolean(flatSchema) && (
								<Select value={selectedField} onChange={this.handleFieldChange} mb={3}>
									{_.map(flatSchema.properties, (value, key) => {
										return (<option value={key}>{value.title || key}</option>)
									})}
								</Select>
							)}

							{Boolean(flatSchema) && Boolean(selectedField) && (
								<Form
									schema={{
										type: 'object',
										properties: {
											[selectedField]: flatSchema.properties[selectedField]
										}
									}}
									hideSubmitButton
									value={updateData}
									onFormChange={this.setUpdateData}
								/>
							)}
						</React.Fragment>
					)}
				</Modal>
			</Fixed>
		)
	}
}
