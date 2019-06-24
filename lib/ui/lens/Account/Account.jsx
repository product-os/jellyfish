/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React from 'react'
import {
	Box,
	Button,
	Divider,
	Tabs,
	Txt
} from 'rendition'
import Link from '../../components/Link'
import CardLayout from '../../layouts/CardLayout'
import Icon from '../../shame/Icon'

export default class Account extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			contacts: null
		}

		this.openCreateChannel = this.openCreateChannel.bind(this)
	}

	componentDidMount () {
		this.bootstrap()
	}

	openCreateChannel () {
		this.props.actions.addChannel({
			head: {
				action: 'create',
				types: _.find(this.props.types, {
					slug: 'contact'
				}),
				seed: {
					markers: this.props.card.markers
				},
				onDone: {
					action: 'link',
					target: this.props.card
				}
			},
			canonical: false
		})
	}

	async bootstrap () {
		const contacts = await this.props.actions.getLinks(this.props.card, 'has contact')
		this.setState({
			contacts
		})
	}

	render () {
		const {
			card,
			channel
		} = this.props
		const {
			contacts
		} = this.state

		return (
			<CardLayout
				card={card}
				channel={channel}
			>
				<Divider width="100%" color="#eee" />

				<Tabs
					tabs={[ 'Overview', 'Contacts' ]}
					style={{
						flex: 1
					}}
				>
					<Box p={3}>
						{Boolean(contacts) && contacts.length > 0 && (
							<Txt>{contacts.length} contacts</Txt>
						)}
					</Box>

					<Box p={3}>
						{!contacts && <Icon name="cog" spin />}

						{Boolean(contacts) && contacts.length === 0 && (
							<Txt>{'This account doesn\'t have any Contacts yet'}</Txt>
						)}

						{Boolean(contacts) && contacts.length > 0 && _.map(contacts, (contact) => {
							return (
								<div>
									<Link
										append={contact.slug || contact.id}
									>
										{contact.name}
									</Link>
								</div>
							)
						})}

						<Button
							mt={4}
							success
							data-test="add-contact"
							onClick={this.openCreateChannel}
						>
							Add Contact
						</Button>
					</Box>
				</Tabs>
			</CardLayout>
		)
	}
}
