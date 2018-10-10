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
import { analytics, sdk } from '../core';
import Icon from './Icon';

const LINKS: { [k: string]: { [t: string]: string } } = {
	'support-thread': {
		'scratchpad-entry': 'scratchpad entry was used in support thread',
	},
};

interface CardLinkerProps {
	card: Card;
	types: Type[];
}

interface CardLinkerState {
	showLinkModal: boolean;
	showCreateModal: boolean;
	linkTypeTargets: Array<{ value: string, label: string | void }>;
	selectedTypeTarget: null | {
		value: string;
		label: string | void;
	};
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
			selectedTypeTarget: linkTypeTargets[0] || null,
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
		if (!selectedTypeTarget) {
			return [];
		}
		const results = await sdk.query({
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: selectedTypeTarget.value,
				},
				name: {
					type: 'string',
					regexp: {
						flags: 'i',
						pattern: value,
					},
				},
			},
		} as any);

		return results.map((card: Card) => ({
			label: card.name,
			value: card.id,
		}));
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

		const linkName = LINKS[card.type][selectedTypeTarget.value];

		sdk.card.link(this.props.card.id, selectedTarget.value, linkName as any)
			.then(() => {
				analytics.track('element.create', {
					element: {
						type: 'link',
					},
				});
			});

		this.setState({
			showLinkModal: false,
		});
	}

	render(): React.ReactNode {
		const { card, types } = this.props;
		const {
			showLinkModal,
			linkTypeTargets,
			selectedTarget,
		} = this.state;
		if (!LINKS[card.type]) {
			return null;
		}

		const typeCard = types.find(t => t.slug === card.type);
		const typeName = typeCard ? typeCard.name : card.type;

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
								<Select>
									{linkTypeTargets.map(t => <option key={t.value}>{t.label || t.value}</option>)}
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
					</Modal>
				)}
			</>
		);
	}
}
