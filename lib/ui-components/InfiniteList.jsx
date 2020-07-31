/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Box
} from 'rendition'
import styled from 'styled-components'

const ScrollArea = styled(Box) `
    overflow-y: auto;
    height: 100%;
`

export class InfiniteList extends React.Component {
	constructor (props, context) {
		super(props, context)

		this.handleRef = this.handleRef.bind(this)
		this.handleScroll = this.handleScroll.bind(this)
		this.queryForMoreIfNecessary = this.queryForMoreIfNecessary.bind(this)
	}

	componentDidMount () {
		const {
			fillMaxArea
		} = this.props
		if (fillMaxArea) {
			this.queryForMoreIfNecessary()
		}
	}

	componentDidUpdate () {
		const {
			fillMaxArea
		} = this.props
		if (fillMaxArea) {
			this.queryForMoreIfNecessary()
		}
	}

	queryForMoreIfNecessary () {
		const {
			onScrollBeginning,
			onScrollEnding,
			processing
		} = this.props
		if (processing) {
			return
		}
		const {
			clientHeight,
			scrollHeight
		} = this.scrollArea
		const noScrollBar = clientHeight === scrollHeight
		if (noScrollBar) {
			if (onScrollBeginning) {
				onScrollBeginning()
			}
			if (onScrollEnding) {
				onScrollEnding()
			}
		}
	}

	handleScroll () {
		const {
			processing,
			onScrollBeginning,
			onScrollEnding,
			triggerOffset
		} = this.props
		if (processing) {
			return
		}
		const {
			scrollTop,
			scrollHeight,
			offsetHeight
		} = this.scrollArea

		if (scrollTop < triggerOffset && onScrollBeginning) {
			onScrollBeginning()
		}

		const scrollOffset = scrollHeight - (scrollTop + offsetHeight)

		if (scrollOffset > triggerOffset) {
			return
		}

		if (onScrollEnding) {
			onScrollEnding()
		}
	}

	handleRef (ref) {
		this.scrollArea = ref
	}

	render () {
		const {
			onScrollEnding,
			onScrollBeginning,
			...rest
		} = this.props

		return (
			<ScrollArea
				{...rest}
				ref={this.handleRef}
				onScroll={this.handleScroll}
			/>
		)
	}
}

InfiniteList.defaultProps = {
	triggerOffset: 200
}
