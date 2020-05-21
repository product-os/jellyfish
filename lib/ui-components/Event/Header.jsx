import React from 'react'
import _ from 'lodash'
import {
	Flex, Txt, Theme
} from 'rendition'
import {
	formatTimestamp
} from '../services/helpers'
import Icon from '../shame/Icon'
import {
	MirrorIcon
} from '../MirrorIcon'
import MessageHeader from './MessageHeader'
import Menu from './Menu'

export default class Header extends React.Component {
	render () {
		const {
			actor, card, threadIsMirrored
		} = this.props

		const typeBase = card.type.split('@')[0]
		const isMessage = typeBase === 'message' || typeBase === 'whisper'
		const timestamp = _.get(card, [ 'data', 'timestamp' ]) || card.created_at

		return (
			<Flex justifyContent="space-between" mb={1}>
				<Flex
					mt={isMessage ? 0 : 1}
					alignItems="center"
					style={{
						lineHeight: 1.75
					}}
				>
					{isMessage && <MessageHeader actor={actor} />}

					{!isMessage && this.getTimelineElement(card)}

					{Boolean(card.data) && Boolean(timestamp) && (
						<Txt color={Theme.colors.text.light} fontSize={1} ml="6px">
							{formatTimestamp(timestamp, true)}
						</Txt>
					)}
					{card.pending ? (
						<Txt color={Theme.colors.text.light} fontSize={1} ml="6px">
							sending...
							<Icon
								style={{
									marginLeft: 6
								}}
								spin
								name="cog"
							/>
						</Txt>
					) : (
						<MirrorIcon
							mirrors={_.get(card, [ 'data', 'mirrors' ])}
							threadIsMirrored={threadIsMirrored}
						/>
					)}
				</Flex>
				{this.props.menuOptions !== false && (
					<Menu isMessage={isMessage} menuOptions={this.props.menuOptions} />
				)}
			</Flex>
		)
	}
}
