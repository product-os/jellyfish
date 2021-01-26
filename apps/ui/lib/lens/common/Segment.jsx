/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import Bluebird from 'bluebird'
import clone from 'deep-copy'
import {
	circularDeepEqual
} from 'fast-equals'
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
import {
	LinkModal
} from '../../components/LinkModal'

class Segment extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			results: props.draftCards || null,
			showLinkModal: false
		}

		this.openCreateChannel = this.openCreateChannel.bind(this)
		this.openLinkModal = this.openLinkModal.bind(this)
		this.hideLinkModal = this.hideLinkModal.bind(this)
		this.updateResults = this.updateResults.bind(this)
		this.getData = this.getData.bind(this)
	}

	componentDidUpdate (prevProps) {
		if (
			!circularDeepEqual(prevProps.segment, this.props.segment)
		) {
			this.setState({
				results: null
			})
			this.getData()
		} else if (
			!circularDeepEqual(prevProps.card, this.props.card) ||
			!circularDeepEqual(prevProps.draftCards, this.props.draftCards)
		) {
			this.getData()
		}
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

	componentDidMount () {
		this.getData()
	}

	updateResults (results) {
		const {
			onCardsUpdated,
			draftCards
		} = this.props
		this.setState({
			results: _.unionBy(results, (draftCards || []), 'id')
		}, () => {
			if (onCardsUpdated) {
				onCardsUpdated(results)
			}
		})
	}

	async getData () {
		const {
			card,
			segment,
			actions,
			sdk
		} = this.props

		if (segment.link) {
			const results = await	actions.getLinks({
				sdk
			}, card, segment.link)
			this.updateResults(results)
		} else if (segment.query) {
			let context = [ card ]
			for (const relation of _.castArray(segment.query)) {
				if (relation.link) {
					context = actions.getLinks({
						sdk
					}, card, relation.link)
				} else {
					const mapped = await Bluebird.map(context, (item) => {
						return actions.queryAPI(helpers.evalSchema(clone(relation), {
							result: item
						}))
					})
					context = _.flatten(mapped)
				}
			}

			this.updateResults(_.flatten(context))
		}
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
				},
				onDone: {
					action: 'link',
					targets: [ card ],
					callback: this.getData
				}
			},
			format: 'create',
			canonical: false
		})
	}

	render () {
		const {
			results,
			showLinkModal
		} = this.state

		const {
			card,
			segment,
			types,
			onSave,
			showLinkToExistingElementButton = true
		} = this.props

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
				flex: 1
			}}>
				<Box flex={1} mt={3} style={{
					minHeight: 0
				}}>
					{results.length === 0 && (
						<Box px={3}>
							<strong>No results found</strong>
						</Box>
					)}
					{Boolean(results.length) && (
						<lens.data.renderer
							tail={results}
							page={1}
							totalPages={1}
							setPage={_.noop}
							pageOptions={{
								limit: 30,
								sortBy: [ 'created_at' ]
							}}
						/>
					)}
				</Box>

				{segment.link && (
					<Flex px={3} pb={3} flexWrap="wrap">

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
						cards={[ card ]}
						types={[ type ]}
						onHide={this.hideLinkModal}
						onSave={onSave}
						onSaved={this.getData}
					/>
				)}
			</Flex>
		)
	}
}

export default withSetup(Segment)
