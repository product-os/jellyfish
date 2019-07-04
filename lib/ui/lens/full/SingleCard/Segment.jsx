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
	evalSchema
} from '../../../services/helpers'
import Link from '../../../components/Link'
import LinkModal from '../../../components/LinkModal'
import Icon from '../../../shame/Icon'

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

	async componentDidMount () {
		const {
			card,
			segment,
			queryAPI,
			getLinks
		} = this.props

		if (segment.link) {
			const results = await	getLinks(card, segment.link)
			this.setState({
				results
			})
		} else if (segment.query) {
			const results = await	queryAPI(evalSchema(segment.query, {
				card
			}))
			this.setState({
				results
			})
		}
	}

	openCreateChannel () {
		const {
			addChannel,
			card,
			segment,
			types
		} = this.props

		addChannel({
			head: {
				action: 'create',
				types: _.find(types, {
					slug: segment.link
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
			card,
			segment,
			types
		} = this.props

		const type = _.find(types, {
			slug: segment.link
		})

		if (!results) {
			return (
				<Box p={3}>
					<Icon name="cog" spin />
				</Box>
			)
		}

		return (
			<Box p={3}>
				{results.length === 0 && (
					<strong>There are no results</strong>
				)}

				{_.map(results, (result) => {
					return (
						<div>
							<Link append={result.slug || result.id}>{result.name || result.slug}</Link>
						</div>
					)
				})}

				{segment.link && (
					<Flex mt={4}>
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
					card={card}
					types={[ type ]}
					show={showLinkModal}
					onHide={this.hideLinkModal}
				/>
			</Box>
		)
	}
}
