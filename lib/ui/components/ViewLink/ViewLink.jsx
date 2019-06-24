/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import _ from 'lodash'
import React from 'react'
import {
	Button,
	Box,
	Flex
} from 'rendition'
import Link from '../Link'
import MentionsCount from '../MentionsCount'
import * as helpers from '../../services/helpers'
import ContextMenu from '../ContextMenu'
import Icon from '../../shame/Icon'

export default class ViewLink extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			showMenu: false
		}

		this.setDefault = this.setDefault.bind(this)
		this.toggleMenu = this.toggleMenu.bind(this)
	}

	toggleMenu () {
		this.setState({
			showMenu: !this.state.showMenu
		})
	}

	setDefault () {
		this.props.setDefault(this.props.card)
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	render () {
		const {
			activeSlice,
			card,
			isActive,
			types,
			update
		} = this.props

		const slices = isActive ? helpers.getViewSlices(card, types) : null

		return (
			<Box>
				<Flex justifyContent="space-between" bg={(isActive && !activeSlice) ? '#eee' : 'none'}>
					<Link
						data-test={`home-channel__item--${card.slug}`}
						style={{
							display: 'block',
							flex: '1'
						}}
						key={card.id}
						py={2}
						pl={3}
						pr={isActive ? 0 : 3}
						color="#333"
						to={`/${card.slug || card.id}`}
					>
						<Flex justifyContent="space-between">
							{card.name}

							{Boolean(update) && card.slug === 'view-my-inbox' && (
								<MentionsCount mr={2}>{update}</MentionsCount>
							)}
						</Flex>
					</Link>

					{isActive &&
							<Button
								pr={3}
								pl={1}
								plain
								onClick={this.toggleMenu}
								icon={<Icon name="ellipsis-v"/>}
							/>
					}

					{this.state.showMenu &&
							<ContextMenu onClose={this.toggleMenu}>
								<Button
									style={{
										display: 'block'
									}}
									plain
									tooltip="Set this view as the default page when logging in"
									onClick={this.setDefault}
								>
									Set as default
								</Button>
							</ContextMenu>
					}
				</Flex>
				{isActive && Boolean(slices) && (
					<ul
						style={{
							padding: 0, margin: 0, listStyle: 'none'
						}}
					>
						{_.map(slices, (slice) => {
							return (
								<React.Fragment key={slice.path}>
									{_.map(slice.values, (value) => {
										const isActiveSlice = activeSlice && (
											activeSlice.path === slice.path && activeSlice.value === value
										)
										const path = `/${card.slug || card.id}...${slice.path}+is+${encodeURIComponent(value)}`
										return (
											<li
												key={value}
												style={{
													background: (isActiveSlice) ? '#eee' : 'none'
												}}
											>
												<Link
													style={{
														display: 'block'
													}}
													py={2}
													pr={3}
													pl={4}
													color="#333"
													data-slicetitle={slice.title}
													data-slicepath={slice.path}
													data-slicevalue={value}
													to={path}
												>
													{slice.title}: {value}
												</Link>
											</li>
										)
									})}
								</React.Fragment>
							)
						})}
					</ul>
				)}
			</Box>
		)
	}
}
