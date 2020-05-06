/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import path from 'path'
import React from 'react'
import {
	Link
} from 'rendition'
import {
	isExternalLink
} from '../services/helpers'

export default class RouterLink extends React.Component {
	constructor (props) {
		super(props)

		this.navigate = this.navigate.bind(this)
	}

	makeUrl () {
		const {
			append,
			location,
			to
		} = this.props

		if (to) {
			return to
		}

		if (append) {
			return path.join(location.pathname, append)
		}

		return null
	}

	navigate (event) {
		const {
			blank,
			to
		} = this.props

		// If control or meta keys are pressed use default browser behaviour
		if (event.ctrlKey || event.metaKey) {
			return true
		}

		// If the link is external use default browser behaviour
		if (blank || isExternalLink(to)) {
			return true
		}

		event.preventDefault()
		const {
			history
		} = this.props

		const url = this.makeUrl()

		history.push(url)
		return false
	}

	render () {
		const props = _.omit(this.props, [
			'match',
			'location',
			'history',
			'to',
			'append'
		])

		const url = this.makeUrl()

		return (
			<Link
				{...props}
				href={url}

				// We should only navigate when `url` is defined
				onClick={url ? this.navigate : props.onClick}
			/>
		)
	}
}
