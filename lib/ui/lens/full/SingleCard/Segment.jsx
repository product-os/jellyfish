/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	Box
} from 'rendition'
import {
	evalSchema
} from '../../../services/helpers'
import Link from '../../../components/Link'
import Icon from '../../../shame/Icon'

export default class Segment extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			results: null
		}
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

	render () {
		const {
			results
		} = this.state

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
			</Box>
		)
	}
}
