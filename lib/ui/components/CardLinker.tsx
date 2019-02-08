/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash';
import * as React from 'react';
import AsyncSelect from 'react-select/lib/Async';
import {
	Box,
	Button,
	Flex,
	Modal,
	Select,
	Txt,
} from 'rendition';
import { CardCreator } from '../components/CardCreator';
import { LINKS } from '../constants';
import { sdk } from '../core';
import {
	createFullTextSearchFilter,
} from '../services/helpers';
import { createLink } from '../services/link';
import { Card, Type } from '../types';
import { ContextMenu } from './ContextMenu';

import Icon from '../shame/Icon';
import { IconButton } from '../shame/IconButton';

interface CardLinkerProps {
	card: Card;
	types: Type[];
}

interface CardLinkerState {
	showMenu: boolean;
	showLinkModal: boolean;
	showCreateModal: boolean;
	results: Card[];
	selectedTarget: Card | null;
	selectedTypeTarget: Card | null;
}

export class CardLinker extends React.Component<CardLinkerProps, CardLinkerState> {
	constructor(props: CardLinkerProps) {
		super(props);

		const { card, types } = props;

		this.state = {
			showMenu: false,
			showLinkModal: false,
			showCreateModal: false,
			results: [],
			selectedTarget: null,
			selectedTypeTarget: _.find(types, { slug: _.first(_.keys(LINKS[card.type])) }) || null,
		};
	}

	public openLinkModal = () => {
		this.setState({
			showLinkModal: true,
			showCreateModal: false,
			showMenu: false,
		});
	}

	public openCreateModal = () => {
		this.setState({
			showLinkModal: false,
			showCreateModal: true,
			showMenu: false,
		});
	}

	public hideLinkModal = () => {
		this.setState({
			showLinkModal: false,
			showCreateModal: false,
			showMenu: false,
		});
	}

	public getLinkTargets = async (value: string) => {
		const { selectedTypeTarget } = this.state;
		if (!selectedTypeTarget || !value) {
			return [];
		}

		const filter = createFullTextSearchFilter(selectedTypeTarget.data.schema, value);

		_.set(filter, [ 'properties', 'type' ], {
			type: 'string',
			const: selectedTypeTarget.slug,
		});

		const results = await sdk.query(filter);

		this.setState({
			results,
		});

		return results.map((card: Card) => ({
			label: card.name || card.slug || card.id,
			value: card.id,
		}));
	}

	public handleTypeTargetSelect = (e: any) => {
		this.setState({
			selectedTypeTarget: _.find(this.props.types, { slug: e.target.value })!,
		});
	}

	public handleTargetSelect = (target: { value: string, label: string | void }) => {
		this.setState({
			selectedTarget: _.find(this.state.results, { id: target.value }) || null,
		});
	}

	public linkToExisting = async () => {
		const { card } = this.props;
		const { selectedTypeTarget } = this.state;

		if (!selectedTypeTarget) {
			return;
		}

		const linkName = LINKS[card.type][selectedTypeTarget.slug];

		createLink(this.props.card, selectedTypeTarget, linkName as any);

		this.setState({
			showLinkModal: false,
		});
	}

	public toggleMenu = () => {
		this.setState({ showMenu: !this.state.showMenu });
	}

	public doneCreatingCard = (newCard: Card | null) => {
		const { card } = this.props;
		const { selectedTypeTarget } = this.state;

		if (!newCard) {
			return;
		}

		if (!selectedTypeTarget) {
			return;
		}

		const linkName = LINKS[card.type][selectedTypeTarget.slug];

		createLink(this.props.card, newCard, linkName as any);

		this.setState({
			showLinkModal: false,
			showCreateModal: false,
		});
	}

	render(): React.ReactNode {
		const { card, types } = this.props;
		const {
			showCreateModal,
			showLinkModal,
			selectedTarget,
			selectedTypeTarget,
		} = this.state;

		const availableTypes = types.filter(t => {
			return LINKS[card.type] && LINKS[card.type].hasOwnProperty(t.slug);
		});

		const linkTypeTargets = availableTypes.map((item) => ({
			value: item.slug,
			label: item.name || item.slug,
		}));


		if (!LINKS[card.type]) {
			return null;
		}

		const typeCard = types.find(t => t.slug === card.type);
		const typeName = typeCard ? typeCard.name : card.type;

		const selectTargetValue = selectedTarget ? {
			value: selectedTarget.id,
			label: selectedTarget.name || selectedTarget.slug,
		} : null;

		return (
			<>
				<span>
					<IconButton
						plaintext
						square={true}
						onClick={this.toggleMenu}
						tooltip={{
							placement: 'left',
							text: `Link this ${typeName} to another element`,
						}}
					>
						<Icon name="bezier-curve" />
					</IconButton>

					{this.state.showMenu &&
						<ContextMenu
							position="bottom"
							onClose={this.toggleMenu}
						>
							<Button
								style={{ display: 'block' }}
								mb={2}
								plaintext
								onClick={this.openLinkModal}
							>
								Link to existing element
							</Button>
							<Button
								style={{ display: 'block' }}
								plaintext
								onClick={this.openCreateModal}
							>
								Create a new element to link to
							</Button>
						</ContextMenu>
					}
				</span>

				{showLinkModal && (
					<Modal
						title={`Link this ${typeName} to another element`}
						cancel={this.hideLinkModal}
						primaryButtonProps={{
							disabled: !selectedTypeTarget,
						}}
						done={this.linkToExisting}
					>
						<Flex align="center">
							<Txt>Link this {typeName} to {linkTypeTargets.length === 1 && (linkTypeTargets[0].label || linkTypeTargets[0].value)}</Txt>
							{linkTypeTargets.length > 1 && (
								<Select
									ml={2}
									value={selectedTypeTarget ? selectedTypeTarget.slug : null}
									onChange={this.handleTypeTargetSelect}
								>
									{linkTypeTargets.map(t => <option value={t.value} key={t.value}>{t.label || t.value}</option>)}
								</Select>
							)}
							<Box flex="1" ml={2}>
								<AsyncSelect
									value={selectTargetValue}
									cacheOptions
									defaultOptions
									onChange={this.handleTargetSelect}
									loadOptions={this.getLinkTargets}
								/>
							</Box>
						</Flex>
					</Modal>
				)}

				<CardCreator
					seed={{}}
					show={showCreateModal}
					type={availableTypes}
					done={this.doneCreatingCard}
					cancel={() => this.setState({ showCreateModal: false, showLinkModal: true })}
				/>
			</>
		);
	}
}
