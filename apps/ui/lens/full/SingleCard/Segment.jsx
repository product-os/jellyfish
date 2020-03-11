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
} from '../../../lens'
import {
	evalSchema
} from '../../../../../lib/ui-components/services/helpers'
import LinkModal from '../../../../../lib/ui-components/LinkModal'
import Icon from '../../../../../lib/ui-components/shame/Icon'

export default class Segment extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			results: null,
			showLinkModal: false
		}

		this.openCreateChannel = this.openCreateChannel.bind(this)
		this.openLinkModal = this.openLinkModal.bind(this)
		this.hideLinkModal = this.hideLinkModal.bind(this)
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
			!circularDeepEqual(prevProps.card, this.props.card)
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

	async getData () {
		const {
			card,
			segment,
			actions
		} = this.props

		if (segment.link) {
			const results = await	actions.getLinks(card, segment.link)
			this.setState({
				results
			})
		} else if (segment.query) {
			let context = [ card ]
			for (const relation of _.castArray(segment.query)) {
				if (relation.link) {
					context = actions.getLinks(card, relation.link)
				} else {
					const mapped = await Bluebird.map(context, (item) => {
						return actions.queryAPI(evalSchema(clone(relation), {
							result: item
						}))
					})
					context = _.flatten(mapped)
				}
			}

			this.setState({
				results: _.flatten(context)
			})
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
				action: 'create',
				types: _.find(types, {
					slug: segment.type.split('@')[0]
				}),
				seed: {
					markers: card.markers
				},
				onDone: {
					action: 'link',
					target: card
				}
			},
			canonical: false
		})
	}

	render () {
		const {
			results,
			showLinkModal
		} = this.state

		const {
			actions,
			card,
			segment,
			types
		} = this.props

		const type = _.find(types, {
			slug: segment.type.split('@')[0]
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
			<React.Fragment>
				{Boolean(results.length) && (
					<lens.data.renderer
						tail={results}
					/>
				)}

				{results.length === 0 && (
					<Box px={3}>
						<strong>There are no results</strong>
					</Box>
				)}

				{!results.length && segment.link && (
					<Flex mt={4} px={3}>
						<Button
							mr={2}
							success
							data-test={`add-${type.slug}`}
							onClick={this.openCreateChannel}
						>
							Add new {type.name || type.slug}
						</Button>

						<Button
							outline
							data-test={`link-to-${type.slug}`}
							onClick={this.openLinkModal}
						>
							Link to an existing {type.name || type.slug}
						</Button>
					</Flex>
				)}

				<LinkModal
					actions={actions}
					card={card}
					types={[ type ]}
					show={showLinkModal}
					onHide={this.hideLinkModal}
				/>
			</React.Fragment>
		)
	}
}
