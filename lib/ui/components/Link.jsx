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

	navigate (event) {
		event.preventDefault()
		const {
			append,
			history,
			location,
			to
		} = this.props

		if (to) {
			history.push(to)
		}

		if (append) {
			history.push(path.join(location.pathname, append))
		}
	}

	render () {
		const props = _.omit(this.props, [
			'match',
			'location',
			'history',
			'to',
			'append'
		])

		return (
			<Link
				{...props}
				onClick={this.navigate}
			/>
		)
	}
}

export default withRouter(RouterLink)
