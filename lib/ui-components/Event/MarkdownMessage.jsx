/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Markdown
} from 'rendition/dist/extra/Markdown'
import Icon from '../shame/Icon'
import MessageContainer from './MessageContainer'
import OverflowButton from './OverflowButton'

export default class TextMessage extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			expanded: false
		}

		this.expand = () => {
			this.setState({
				expanded: !this.state.expanded
			})
		}

		this.setMessageElement = (element) => {
			if (element) {
				this.messageElement = element
				this.setState({
					messageHeight: element.clientHeight
				})
			}
		}
	}

	render () {
		const {
			card,
			actor,
			message,
			messageOverflows,
			messageCollapsedHeight
		} = this.props
		return (
			<MessageContainer
				ref={this.setMessageElement}
				card={card}
				actor={actor}
				py={2}
				px={3}
				mr={1}
			>
				<Markdown
					py='3px'
					style={{
						fontSize: 'inherit',
						overflow: messageOverflows ? 'hidden' : 'initial',
						maxHeight: !this.state.expanded && messageOverflows
							? messageCollapsedHeight
							: 'none'
					}}
					data-test={card.pending ? '' : 'event-card__message'}
					flex={0}
				>
					{message}
				</Markdown>

				{messageOverflows && (
					<OverflowButton
						className="event-card__expand"
						plain
						width="100%"
						py={1}
						onClick={this.expand}
						expanded={this.state.expanded}
					>
						<Icon name={`chevron-${this.state.expanded ? 'up' : 'down'}`} />
					</OverflowButton>
				)}
			</MessageContainer>
		)
	}
}
