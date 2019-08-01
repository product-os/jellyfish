/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import path from 'path'
import React from 'react'
import {
	withRouter
} from 'react-router-dom'
import {
	Link
} from 'rendition'

class RouterLink extends React.Component {
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

		return ''
	}

	navigate (event) {
		event.preventDefault()
		const {
			history
		} = this.props

		const url = this.makeUrl()

		history.push(url)
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
				onClick={this.navigate}
			/>
		)
	}
}

export default withRouter(RouterLink)
