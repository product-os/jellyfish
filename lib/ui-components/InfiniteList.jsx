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

// ToDo: implement inverted list
export class InfiniteList extends React.Component {
	constructor (props, context) {
		super(props, context)

		this.processing = false
		this.handleRef = this.handleRef.bind(this)
		this.handleScroll = this.handleScroll.bind(this)
	}

	handleRef (scrollArea) {
		this.scrollArea = scrollArea
	}

	async handleScroll () {
		if (this.processing ||
            this.props.processing) {
			return
		}

		const scrollOffset = this.scrollArea.scrollHeight - (this.scrollArea.scrollTop + this.scrollArea.offsetHeight)

		if (scrollOffset > this.props.triggerOffset) {
			return
		}

		this.processing = true
		await this.props.onScrollEnding()
		this.processing = false
	}

	render () {
		const {
			onScrollEnding,
			...rest
		} = this.props

		return (
			<ScrollArea {...rest}
				ref={this.handleRef}
				onScroll={this.handleScroll}
			/>
		)
	}
}

InfiniteList.defaultProps = {
	triggerOffset: 200
}
