import React from 'react';
import _ from 'lodash';
import { strict as assert } from 'assert';
import pluralize from 'pluralize';
import { Badge, Modal, Select, Txt, Box } from 'rendition';
import * as notifications from '../../services/notifications';
import { Icon } from '../';
import type { Contract, ContractSummary, TypeContract } from 'autumndb';
import { AutoCompleteCardSelect } from '../AutoCompleteCardSelect';
import { Hideable } from '../Hideable';
import * as linkUtils from './util';
import { TypeFilter } from './TypeFilter';
import * as helpers from '../../services/helpers';

const HideableBox = Hideable(Box);

export interface LinkModalProps {
	actions: {
		createLink: (
			fromCard: ContractSummary,
			toCard: ContractSummary,
			linkVerb: string,
			options: any,
		) => void;
	};
	allTypes: TypeContract[];
	targetTypes: TypeContract[];
	cards: Contract[];
	target?: Contract;
	linkVerb?: string;
	onHide: () => void;
	onSave?: (
		fromCard: ContractSummary,
		toCard: ContractSummary,
		linkVerb: string,
	) => void;
	onSaved?: (toCard: ContractSummary, linkVerb: string) => void;
}

export const LinkModal: React.FunctionComponent<LinkModalProps> = ({
	actions,
	cards,
	onHide,
	onSave,
	onSaved,
	target,
	allTypes,
	targetTypes,
	linkVerb,
}) => {
	const [selectedTarget, setSelectedTarget] = React.useState<
		Contract | undefined
	>(target);
	const [cardType, setCardType] = React.useState<TypeContract>();
	const [submitting, setSubmitting] = React.useState(false);
	const [linkType, setLinkType] = React.useState<linkUtils.LinkType>();

	// Get and cache the type of the cards to be linked _from_
	const fromType = linkUtils.getCommonTypeBase(cards);
	const fromTypeContract: TypeContract = React.useMemo(() => {
		return _.find(allTypes, ['slug', fromType])!;
	}, [allTypes, fromType]);

	// Find all types that can be linked _to_, based on:
	// 1. the available types
	// 2. the type of the source card(s)
	// 3. the link verb (if specified)
	// 4. the target ('to') card (if specified)
	const validTypes = React.useMemo(() => {
		return linkUtils.getValidTypes(targetTypes, fromType, linkVerb, target);
	}, [targetTypes, fromType, linkVerb, target]);

	// Get the link constraints that apply based on:
	// 1. the type of the source card(s)
	// 2. the link verb (if specified)
	// 3. the target ('to') card (if specified)
	const linkTypeTargets = React.useMemo(() => {
		const targets = linkUtils.getFilteredLinkConstraints(
			fromType,
			linkVerb,
			selectedTarget,
		);
		setLinkType(targets[0]);
		return targets;
	}, [fromType, linkVerb, selectedTarget]);

	const onDone = async () => {
		setSubmitting(true);

		assert.ok(linkType);
		assert.ok(selectedTarget);

		const linkCard = async (card: ContractSummary) => {
			if (onSave) {
				onSave(card, selectedTarget, linkType.name);
			} else {
				await actions.createLink(card, selectedTarget, linkType.name, {
					skipSuccessMessage: true,
				});
				if (onSaved) {
					onSaved(selectedTarget, linkType.name);
				}
			}
		};

		const linkTasks = cards.map(linkCard);
		await Promise.all(linkTasks);

		notifications.addNotification(
			'success',
			`Created new link${cards.length > 1 ? 's' : ''}`,
		);
		setSubmitting(false);
		setSelectedTarget(undefined);
		onHide();
	};

	const typeName = fromTypeContract
		? fromTypeContract.name || fromTypeContract.slug
		: fromType;

	// The title is constructed based on the props passed to the component
	const title = React.useMemo(() => {
		if (typeName) {
			let titleSource = '';
			if (cards.length === 1) {
				titleSource = `"${cards[0].name || cards[0].slug}"`;
			} else {
				titleSource = `${pluralize('this', cards.length)} ${pluralize(
					typeName,
					cards.length,
					true,
				)}`;
			}
			const titleTarget =
				validTypes.length === 1 ? validTypes[0].name : 'another element';
			return `Link ${titleSource} to ${titleTarget}`;
		} else {
			return 'Link contract';
		}
	}, [linkVerb, fromTypeContract, validTypes, cards, linkTypeTargets]);

	const typeCardIndex = targetTypes.findIndex((type) => {
		return type.slug === helpers.getTypeBase(fromTypeContract.slug);
	});

	return (
		<Modal
			title={title}
			cancel={onHide}
			primaryButtonProps={
				{
					disabled: !linkType || !selectedTarget || submitting,
					'data-test': 'card-linker--existing__submit',
				} as any
			}
			action={submitting ? <Icon spin name="cog" /> : 'OK'}
			done={onDone}
			style={{ overflowY: 'inherit' }}
		>
			<Txt mb={3} ml="8px">
				<Badge shade={typeCardIndex} mr={2}>
					{typeName}
				</Badge>
				{cards[0].name || cards[0].slug}
			</Txt>
			{!linkVerb && (
				<HideableBox isHidden={!selectedTarget || linkTypeTargets.length === 1}>
					<Select
						mb={3}
						id="card-linker--type-select"
						value={linkType || _.first(linkTypeTargets)}
						onChange={({ option }: { option: linkUtils.LinkType }) => {
							setLinkType(option);
						}}
						labelKey="name"
						valueKey="slug"
						options={linkTypeTargets}
						data-test="card-linker--type__input"
					/>
				</HideableBox>
			)}
			{!target && validTypes.length > 1 && (
				<TypeFilter
					types={validTypes}
					activeFilter={cardType}
					onSetType={setCardType}
					mb={4}
				/>
			)}
			<AutoCompleteCardSelect
				placeholder="Search..."
				autoFocus
				value={selectedTarget}
				cardType={_.map(_.castArray(cardType || validTypes), 'slug')}
				isDisabled={Boolean(target)}
				onChange={setSelectedTarget}
			/>
		</Modal>
	);
};
