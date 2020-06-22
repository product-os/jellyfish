/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import copy from 'copy-to-clipboard'
import styled from 'styled-components'
import {
	Theme, Txt, Flex, Button
} from 'rendition'
import {
	formatTimestamp
} from '../services/helpers'
import Icon from '../shame/Icon'
import {
	ActionLink
} from '../shame/ActionLink'
import {
	MirrorIcon
} from '../MirrorIcon'
import ContextMenu from '../ContextMenu'

const ContextWrapper = styled(Flex) `
	padding: 2px 4px 2px 2px;
 	border-radius: 6px;
	box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
 	border: solid 0.5px #e8ebf2;
 	position: absolute;
 	right: 16px;
 	bottom: -6px;
 	background: #fff;
	opacity: ${(props) => { return props.card.pending || props.updating || props.editing ? 1 : 0 }};
	transition: 150ms ease-in-out opacity, 150ms ease-in-out width;
	.event-card:hover & {
		opacity: 1;
	}
`

export default function EventContext ({
	card,
	menuOptions,
	updating,
	editing,
	isOwnMessage,
	isMessage,
	threadIsMirrored,
	onEditMessage,
	onCommitEdit,
	onCancelEdit
}) {
	const [ showMenu, setShowMenu ] = React.useState(false)
	const toggleMenu = () => {
		setShowMenu(!showMenu)
	}

	const timestamp = _.get(card, [ 'data', 'timestamp' ]) || card.created_at

	const copyJSON = (event) => {
		event.preventDefault()
		event.stopPropagation()
		copy(JSON.stringify(card, null, 2))
	}

	const copyRawMessage = (event) => {
		event.preventDefault()
		event.stopPropagation()
		copy(card.data.payload.message)
	}

	const wrapperProps = {
		alignItems: 'center',
		card,
		updating,
		editing
	}

	const txtProps = {
		color: Theme.colors.text.light,
		fontSize: 1
	}

	if (editing) {
		return (
			<ContextWrapper {...wrapperProps}>
				{updating && (
					<Txt {...txtProps} ml={1} data-test="event-header__status">
						<Icon spin name="cog" />
						<Txt.span ml={1}>updating...</Txt.span>
					</Txt>
				)}
				<Button
					px={2}
					py={1}
					plain
					primary
					data-test="event-header__btn--save-edit"
					icon={<Icon name="check"/>}
					onClick={onCommitEdit}
					disabled={updating}
					tooltip={{
						placement: 'left',
						text: 'Save changes'
					}}
				/>
				<Button
					px={2}
					py={1}
					plain
					tertiary
					data-test="event-header__btn--cancel-edit"
					icon={<Icon name="undo"/>}
					onClick={onCancelEdit}
					disabled={updating}
					tooltip={{
						placement: 'left',
						text: 'Cancel changes'
					}}
				/>
			</ContextWrapper>
		)
	}

	return (
		<ContextWrapper {...wrapperProps}>
			{(card.pending) && (
				<Txt {...txtProps} ml={1} data-test="event-header__status">
					<Icon spin name="cog" />
					<Txt.span ml={1}>sending...</Txt.span>
				</Txt>
			)}
			{ threadIsMirrored && <MirrorIcon mirrors={_.get(card, [ 'data', 'mirrors' ])} /> }
			{Boolean(card.data) && Boolean(timestamp) && (
				<Txt
					className="event-card--timestamp"
					color={Theme.colors.text.light}
					fontSize={1}
					ml={1}
				>
					{formatTimestamp(timestamp, true)}
				</Txt>
			)}
			{menuOptions !== false && (
				<React.Fragment>
					<Button
						className="event-card--actions"
						data-test="event-header__context-menu-trigger"
						px={2}
						py={1}
						ml={1}
						plain
						onClick={toggleMenu}
						icon={<Icon name="ellipsis-v" />}
					/>

					{showMenu && (
						<ContextMenu position="bottom" onClose={toggleMenu}>
							<React.Fragment>
								{isOwnMessage && !card.pending && !updating && (
									<ActionLink
										data-test="event-header__link--edit-message"
										onClick={onEditMessage}>
										Edit message
									</ActionLink>
								)}

								<ActionLink
									data-test="event-header__link--copy-json"
									onClick={copyJSON}
									tooltip={{
										text: 'JSON copied!',
										trigger: 'click'
									}}
								>
								Copy as JSON
								</ActionLink>

								{isMessage && (
									<ActionLink
										data-test="event-header__link--copy-raw"
										onClick={copyRawMessage}
										tooltip={{
											text: 'Message copied!',
											trigger: 'click'
										}}
									>
									Copy raw message
									</ActionLink>
								)}

								{menuOptions}
							</React.Fragment>
						</ContextMenu>
					)}
				</React.Fragment>
			)}
		</ContextWrapper>
	)
}
