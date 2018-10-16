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
import { Card, Type } from '../../Types';
import { CardCreator } from '../components/CardCreator';
import { LINKS } from '../constants';
import { sdk } from '../core';
import {
	createFullTextSearchFilter,
} from '../services/helpers';
import { createLink } from '../services/link';
import Icon from './Icon';

interface CardLinkerProps {
	card: Card;
	types: Type[];
}

interface CardLinkerState {
	showLinkModal: boolean;
	showCreateModal: boolean;
	linkTypeTargets: Array<{ value: string, label: string | void }>;
	selectedTypeTarget: string;
	selectedTarget: null | {
		value: string;
		label: string | void;
	};
}

export class CardLinker extends React.Component<CardLinkerProps, CardLinkerState> {
	constructor(props: CardLinkerProps) {
		super(props);

		const { card, types } = props;
		const linkTypeTargets = _.keys(LINKS[card.type]).map((slug) => ({
			value: slug,
			label: _.get(_.find(types, { slug }), 'name'),
		}));

		this.state = {
			showLinkModal: false,
			showCreateModal: false,
			linkTypeTargets,
			selectedTypeTarget: _.get(linkTypeTargets, [ '0', 'value' ]) || null,
			selectedTarget: null,
		};
	}

	public openLinkModal = () => {
		this.setState({
			showLinkModal: true,
			showCreateModal: false,
		});
	}

	public hideLinkModal = () => {
		this.setState({
			showLinkModal: false,
			showCreateModal: false,
		});
	}

	public getLinkTargets = async (value: string) => {
		const { selectedTypeTarget } = this.state;
		if (!selectedTypeTarget || !value) {
			return [];
		}
		const typeCard = _.find(this.props.types, { slug: selectedTypeTarget })!;
		const filter = createFullTextSearchFilter(typeCard.data.schema, value);
		_.set(filter, [ 'properties', 'type' ], {
			type: 'string',
			const: typeCard.slug,
		});
		const results = await sdk.query(filter);

		return results.map((card: Card) => ({
			label: card.name || card.slug || card.id,
			value: card.id,
		}));
	}

	public handleTypeTargetSelect = (e: any) => {
		this.setState({
			selectedTypeTarget: e.target.value,
		});
	}

	public handleTargetSelect = (target: { value: string, label: string | void }) => {
		this.setState({
			selectedTarget: target,
		});
	}

	public linkToExisting = () => {
		const { card } = this.props;
		const { selectedTarget, selectedTypeTarget } = this.state;

		if (!selectedTarget || !selectedTypeTarget) {
			return;
		}

		const linkName = LINKS[card.type][selectedTypeTarget];

		createLink(this.props.card.id, selectedTarget.value, linkName as any);

		this.setState({
			showLinkModal: false,
		});
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

		const linkName = LINKS[card.type][selectedTypeTarget];

		createLink(this.props.card.id, newCard.id, linkName as any);

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
			linkTypeTargets,
			selectedTarget,
			selectedTypeTarget,
		} = this.state;

		if (!LINKS[card.type]) {
			return null;
		}

		const typeCard = types.find(t => t.slug === card.type);
		const typeName = typeCard ? typeCard.name : card.type;
		const selectedTypeCard = types.find(t => t.slug === selectedTypeTarget);

		return (
			<>
				<Button
					plaintext
					square={true}
					mr={1}
					className="card-actions__btn--edit"
					onClick={this.openLinkModal}
					tooltip={{
						placement: 'left',
						text: `Link this ${typeName} to another element`,
					}}
				>
					<Icon name="bezier-curve" />
				</Button>

				{showLinkModal && (
					<Modal
						title={`Link this ${typeName} to another element`}
						cancel={this.hideLinkModal}
						primaryButtonProps={{
							disabled: !selectedTarget,
						}}
						done={this.linkToExisting}
					>
						<Flex align="center">
							<Txt>Link this {typeName} to {linkTypeTargets.length === 1 && (linkTypeTargets[0].label || linkTypeTargets[0].value)}</Txt>
							{linkTypeTargets.length > 1 && (
								<Select
									ml={2}
									value={selectedTypeTarget}
									onChange={this.handleTypeTargetSelect}
								>
									{linkTypeTargets.map(t => <option value={t.value} key={t.value}>{t.label || t.value}</option>)}
								</Select>
							)}
							<Box flex="1" ml={2}>
								<AsyncSelect
									value={selectedTarget}
									cacheOptions
									defaultOptions
									onChange={this.handleTargetSelect}
									loadOptions={this.getLinkTargets}
								/>
							</Box>
						</Flex>

						<Txt mb={2}><strong>OR</strong></Txt>

						<Flex align="center">
							<Txt>Link this {typeName} to a new {linkTypeTargets.length === 1 && (linkTypeTargets[0].label || linkTypeTargets[0].value)}</Txt>

							{linkTypeTargets.length > 1 && (
								<Select
									ml={2}
									value={selectedTypeTarget}
									onChange={this.handleTypeTargetSelect}
								>
									{linkTypeTargets.map(t => <option value={t.value} key={t.value}>{t.label || t.value}</option>)}
								</Select>
							)}

							<Button
								ml={2}
								success
								onClick={() => this.setState({ showCreateModal: true, showLinkModal: false })}
							>
								<Icon name="plus" style={{color: 'white'}} />
							</Button>
						</Flex>
					</Modal>
				)}

				<CardCreator
					seed={{}}
					show={showCreateModal}
					type={selectedTypeCard!}
					done={this.doneCreatingCard}
					cancel={() => this.setState({ showCreateModal: false, showLinkModal: true })}
				/>
			</>
		);
	}
}
