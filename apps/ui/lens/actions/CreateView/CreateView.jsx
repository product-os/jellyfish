/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React from 'react'
import {
	Redirect
} from 'react-router-dom'
import {
	Box,
	Flex,
	Heading,
	Input,
	Txt
} from 'rendition'
import styled from 'styled-components'
import * as helpers from '../../../services/helpers'
import Avatar from '@jellyfish/ui-components/shame/Avatar'
import Icon from '@jellyfish/ui-components/shame/Icon'
import CardLayout from '../../../layouts/CardLayout'
import {
	analytics,
	sdk
} from '../../../core'

const UserRow = styled(Box) `
	border-bottom: 1px solid #eee;
	cursor: pointer;

	&:hover {
		background: #eee;
	}
`

export default class CreateLens extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			searchTerm: '',
			users: null
		}

		this.close = this.close.bind(this)
		this.createView = this.createView.bind(this)
		this.handleSearchTermChange = this.handleSearchTermChange.bind(this)

		this.loadUsers()

		this.loadUsers = _.debounce(this.loadUsers, 500)
	}

	async createView (event) {
		const {
			user
		} = this.props
		const id = event.currentTarget.dataset.userid

		const targetUser = _.find(this.state.users, {
			id
		})

		if (!targetUser) {
			return
		}

		this.setState({
			submitting: true
		})

		// Sort the user slugs here, so that the view slug and markers are always
		// the same, no matter who initiates the view creation
		const slugs = [ user.slug, targetUser.slug ].sort()

		const compoundMarker = slugs.join('+')

		const view = {
			type: 'view',
			name: `${slugs[0].replace('user-', '')} - ${slugs[1].replace('user-', '')}`,
			slug: `view-121-${slugs.join('-')}`,

			// Add a compound marker, which will only allow yourself of the target
			// user to see the view
			markers: [ compoundMarker ],
			data: {
				allOf: [
					{
						name: 'Marked threads',
						schema: {
							$$links: {
								'has attached element': {
									type: 'object',
									properties: {
										type: {
											enum: [
												'message',
												'update',
												'create',
												'whisper'
											]
										}
									},
									additionalProperties: true
								}
							},
							type: 'object',
							properties: {
								type: {
									type: 'string',
									const: 'thread'
								},
								markers: {
									type: 'array',
									items: {
										// The view should only return threads that have the same
										// compound marker
										const: compoundMarker
									},
									minItems: 1
								}
							},
							additionalProperties: true,
							required: [
								'type',
								'markers'
							]
						}
					}
				],
				lenses: [
					'lens-interleaved'
				]
			}
		}

		// Check if the view already exists, otherwise create it
		try {
			const existing = await sdk.card.get(view.slug)
			this.handleDone(existing)
		} catch (err) {
			sdk.card.create(view)
				.catch((error) => {
					this.props.actions.addNotification('danger', error.message)
				})
				.then((card) => {
					if (card) {
						analytics.track('element.create', {
							element: {
								type: card.type
							}
						})
					}
					this.handleDone(card || null)
				})
				.finally(() => {
					this.setState({
						submitting: false
					})
				})
		}
	}

	close () {
		this.props.actions.removeChannel(this.props.channel)
	}

	handleDone (newCard) {
		const {
			onDone
		} = this.props.channel.data.head

		if (!onDone) {
			return
		}

		if (onDone.action === 'open') {
			this.setState({
				redirectTo: `/${newCard.slug || newCard.id}`
			})

			return
		}

		if (onDone.action === 'link') {
			const card = onDone.target
			const {
				linkOption,
				selectedTypeTarget
			} = this.state
			if (!newCard) {
				return
			}
			if (!selectedTypeTarget) {
				return
			}
			this.props.actions.createLink(card, newCard, linkOption.name)
			this.close()
		}
	}

	handleSearchTermChange (event) {
		const term = event.target.value
		this.setState({
			searchTerm: term
		})

		this.loadUsers(term)
	}

	async loadUsers () {
		const {
			searchTerm
		} = this.state
		const {
			allTypes
		} = this.props

		const userType = _.find(allTypes, {
			slug: 'user'
		})

		const linksQuery = {
			$$links: {
				'is member of': {
					type: 'object',
					properties: {
						slug: {
							// TODO: Don't hardcode the org, and instead infer it from the user
							const: 'org-balena'
						}
					}
				}
			}
		}

		const query = Object.assign(
			searchTerm
				? helpers.createFullTextSearchFilter(userType.data.schema, searchTerm)
				: {
					type: 'object',
					properties: {
						type: {
							const: 'user'
						}
					},
					additionalProperties: true
				},
			linksQuery
		)

		const users = await sdk.query(query)

		this.setState({
			users
		})
	}

	render () {
		const {
			redirectTo,
			searchTerm,
			users,
			submitting
		} = this.state

		const {
			card,
			channel
		} = this.props

		if (redirectTo) {
			return <Redirect push to={redirectTo} />
		}

		return (
			<CardLayout
				noActions
				overflowY
				onClose={this.close}
				card={card}
				channel={channel}
				title={(
					<Heading.h4>
						Create a private conversation
					</Heading.h4>
				)}
			>
				{Boolean(submitting) && (
					<Box p={3}>
						<Icon spin name="cog"/>
					</Box>
				)}

				{!submitting && (
					<Box p={3}>
						<Input
							placeholder="Search for users"
							value={searchTerm}
							data-test="private-conversation-search-input"
							onChange={this.handleSearchTermChange}
						/>

						{!users && <Icon name="cog" spin />}

						{Boolean(users) && _.map(users, (user) => {
							return (
								<UserRow
									key={user.id}
									py={2}
									data-userid={user.id}
									data-test={`private-conversation-${user.slug}`}
									onClick={this.createView}
								>
									<Flex>
										<Avatar
											name={user.name || user.slug.replace('user-', '')}
											url={_.get(user, [ 'data', 'avatar' ])}
										/>

										<Box ml={2}>
											<strong>{user.slug.replace('user-', '')}</strong>

											<br />
											<strong>{user.data.email}</strong>
										</Box>
									</Flex>
								</UserRow>
							)
						})}

						{Boolean(users) && users.length === 0 && (
							<Txt p={3}>
								Your search - <strong>{searchTerm}</strong> - did not match any users.
							</Txt>
						)}
					</Box>
				)}
			</CardLayout>
		)
	}
}
