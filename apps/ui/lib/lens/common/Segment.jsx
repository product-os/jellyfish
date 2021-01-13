/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	Box,
	Button,
	Flex
} from 'rendition'
import {
	getLens
} from '../../lens'
import {
	helpers,
	Icon,
	withSetup
} from '@balena/jellyfish-ui-components'
import LinkModal from '../../components/LinkModal'

class Segment extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			showLinkModal: false
		}

		this.openCreateChannel = this.openCreateChannel.bind(this)
		this.openLinkModal = this.openLinkModal.bind(this)
		this.hideLinkModal = this.hideLinkModal.bind(this)
	}

	openLinkModal () {
		this.setState({
			showLinkModal: true
		})
	}

	hideLinkModal () {
		this.setState({
			showLinkModal: false
		})
	}

	openCreateChannel () {
		const {
			actions: {
				addChannel
			},
			card,
			segment,
			types
		} = this.props

		addChannel({
			head: {
				types: _.find(types, {
					slug: segment.type.split('@')[0]
				}),
				seed: {
					markers: card.markers
				}
			},
			format: 'create',
			canonical: false
		})
	}

	render () {
		const {
			showLinkModal
		} = this.state

		const {
			draftCards,
			actions,
			card,
			segment,
			types,
			onSave,
			showLinkToExistingElementButton = true
		} = this.props

		const linkedCards = _.get(card, [ 'links', segment.link ], draftCards)
		const results = _.unionBy(linkedCards, (draftCards || []), 'id')

		const type = _.find(types, {
			slug: helpers.getRelationshipTargetType(segment)
		})

		if (!results) {
			return (
				<Box p={3}>
					<Icon name="cog" spin />
				</Box>
			)
		}

		const lens = getLens('list', results)

		return (
			<Flex flexDirection='column' style={{
				height: '100%'
			}}>
				<Box flex={1} style={{
					minHeight: 0
				}}>
					{Boolean(results.length) && (
						<lens.data.renderer
							tail={results}
						/>
					)}
				</Box>

				{results.length === 0 && (
					<Box px={3} mt={2}>
						<strong>There are no results</strong>
					</Box>
				)}

				{segment.link && (
					<Flex px={3} pb={2} flexWrap="wrap">

						{!onSave &&
							<Button
								mr={2}
								mt={2}
								success
								data-test={`add-${type.slug}`}
								onClick={this.openCreateChannel}
							>
								Add new {type.name || type.slug}
							</Button>
						}

						{showLinkToExistingElementButton && (
							<Button
								outline
								mt={2}
								data-test={`link-to-${type.slug}`}
								onClick={this.openLinkModal}
							>
								Link to an existing {type.name || type.slug}
							</Button>
						)}
					</Flex>
				)}

				{showLinkModal && (
					<LinkModal
						linkVerb={segment.link}
						actions={actions}
						cards={[ card ]}
						types={[ type ]}
						onHide={this.hideLinkModal}
						onSave={onSave}
					/>
				)}
			</Flex>
		)
	}
}

export default withSetup(Segment)
