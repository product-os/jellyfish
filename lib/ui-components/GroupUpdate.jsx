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
	patchPath
} from '@jellyfish/ui-components/services/helpers'
import {
	withSetup
} from './SetupProvider'

const DELIMITER = '___'

class GroupUpdate extends React.Component {
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
			const value = this.state.updateData[flattenedKey]
			this.setState({
				processing: true
			})
			const length = this.props.cards.length
			let processed = 0
			Bluebird.map(this.props.cards, (card) => {
				const patch = patchPath(card, keys, value)

				return this.props.sdk.card.update(card.id, card.type, patch)
					.then(() => {
						this.props.analytics.track('element.update', {
							element: {
								id: card.id,
								type: card.type
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
		this.handleFieldChange = (field) => {
			this.setState({
				selectedField: field.option.value
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
								<Select
									value={_.get(flatSchema.properties, [ selectedField, 'title' ], selectedField)}
									onChange={this.handleFieldChange}
									mb={3}
									labelKey="label"
									options={_.map(flatSchema.properties, (value, key) => {
										return {
											value: key,
											label: value.title || key
										}
									})}
								/>
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

export default withSetup(GroupUpdate)
