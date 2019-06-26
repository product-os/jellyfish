/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	DragSource
} from 'react-dnd'
import Async from 'react-select/lib/Async'
import {
	Box,
	Button,
	Modal,
	Flex,
	Txt,
	Select
} from 'rendition'
import constants from '../../constants'
import * as helpers from '../../services/helpers'
import ContextMenu from '../ContextMenu'
import Icon from '../../shame/Icon'

export default class LinkModal extends React.Component {
	constructor (props) {
		super(props)
		this.getLinkTargets = async (value) => {
			try {
				const {
					selectedTypeTarget
				} = this.state
				if (!selectedTypeTarget || !value) {
					return []
				}
				const filter = helpers.createFullTextSearchFilter(selectedTypeTarget.data.schema, value)
				_.set(filter, [ 'properties', 'type' ], {
					type: 'string',
					const: selectedTypeTarget.slug
				})
				const results = await this.props.actions.queryAPI(filter)
				this.setState({
					results
				})
				return results.map((card) => {
					return {
						label: card.name || card.slug || card.id,
						value: card.id
					}
				})
			} catch (error) {
				this.props.actions.addNotification('danger', error.message || error)
			}

			return null
		}
		this.handleTypeTargetSelect = (event) => {
			this.setState({
				selectedTypeTarget: _.find(this.props.types, {
					slug: event.target.value
				})
			})
		}
		this.handleTargetSelect = (target) => {
			this.setState({
				selectedTarget: _.find(this.state.results, {
					id: target.value
				}) || null
			})
		}
		this.linkToExisting = async () => {
			const {
				card
			} = this.props
			const {
				selectedTypeTarget,
				selectedTarget
			} = this.state
			if (!selectedTypeTarget || !selectedTarget) {
				return
			}
			const linkName = constants.LINKS[card.type][selectedTypeTarget.slug]
			this.props.actions.createLink(this.props.card, selectedTarget, linkName)
			this.setState({
				selectedTarget: null
			})
			this.props.onHide()
		}

		const {
			card, types
		} = props

		this.state = {
			results: [],
			selectedTarget: null,
			selectedTypeTarget: _.find(types, {
				slug: _.first(_.keys(constants.LINKS[card.type]))
			}) || null
		}
	}

	render () {
		const {
			card,
			show,
			types
		} = this.props
		const {
			selectedTarget,
			selectedTypeTarget
		} = this.state

		if (!show) {
			return null
		}

		const linkTypeTargets = types.map((item) => {
			return {
				value: item.slug,
				label: item.name || item.slug
			}
		})
		if (!constants.LINKS[card.type]) {
			return null
		}
		const typeCard = _.find(types, [ 'slug', card.type ])
		const typeName = typeCard ? typeCard.name : card.type
		const selectTargetValue = selectedTarget ? {
			value: selectedTarget.id,
			label: selectedTarget.name || selectedTarget.slug
		} : null

		return (
			<Modal
				title={`Link this ${typeName} to another element`}
				cancel={this.props.onHide}
				primaryButtonProps={{
					disabled: !selectedTypeTarget,
					'data-test': 'card-linker--existing__submit'
				}}
				done={this.linkToExisting}
			>
				<Flex align="center">
					<Txt>
						Link this {typeName} to{' '}
						{linkTypeTargets.length === 1 && (linkTypeTargets[0].label || linkTypeTargets[0].value)}
					</Txt>
					{linkTypeTargets.length > 1 && (
						<Select ml={2}
							value={selectedTypeTarget ? selectedTypeTarget.slug : null}
							onChange={this.handleTypeTargetSelect}
						>
							{linkTypeTargets.map((type) => {
								return <option value={type.value} key={type.value}>{type.label || type.value}</option>
							})}
						</Select>
					)}
					<Box
						flex="1"
						ml={2}
						data-test="card-linker--existing__input"
					>
						<Async
							classNamePrefix="jellyfish-async-select"
							value={selectTargetValue}
							cacheOptions defaultOptions
							onChange={this.handleTargetSelect}
							loadOptions={this.getLinkTargets}
						/>
					</Box>
				</Flex>
			</Modal>
		)
	}
}
