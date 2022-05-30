import { Contract, TypeContract } from '@balena/jellyfish-types/build/core';
import _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { Flex, Txt } from 'rendition';
import { CloseButton, Column, LinksProvider, useSetup } from '../../components';
import CardActions from '../../components/CardActions';
import Markers from '../../components/Markers';
import { selectors } from '../../store';
import { ChannelContract } from '../../types';

interface StateProps {
	types: TypeContract[];
}

interface OwnProps {
	actionItems?: React.ReactNode;
	card: Contract;
	channel: ChannelContract;
	children: React.ReactNode;
	inlineActionItems?: JSX.Element;
	noActions?: boolean;
	onClose?: () => void;
	overflowY?: boolean;
	title?: JSX.Element;
}

type Props = StateProps & OwnProps;

const CardLayout = (props: Props) => {
	const {
		inlineActionItems,
		actionItems,
		card,
		channel,
		children,
		noActions,
		overflowY,
		title,
		types,
	} = props;

	const { sdk } = useSetup()!;
	const typeBase = card.type && card.type.split('@')[0];

	const typeContract = _.find(types, {
		slug: typeBase,
	});
	const typeName = typeContract
		? !typeContract.version || typeContract.version === '1.0.0'
			? typeContract.name
			: `${typeContract.name} v${typeContract.version}`
		: null;

	const versionSuffix = card.version === '1.0.0' ? '' : ` v${card.version}`;

	return (
		<LinksProvider sdk={sdk} cards={typeBase ? [card] : []} link="is owned by">
			<Column
				className={`column--${typeBase || 'unknown'} column--slug-${
					card.slug || 'unknown'
				}`}
				overflowY={overflowY}
				data-test={props['data-test']}
			>
				<Flex
					p={3}
					pb={0}
					flexDirection={['column-reverse', 'column-reverse', 'row']}
					justifyContent="space-between"
					alignItems="center"
				>
					<Flex
						flex={1}
						alignSelf={['flex-start', 'flex-start', 'inherit']}
						my={[2, 2, 0]}
					>
						{title}

						{!title && (
							<div>
								<Txt bold>
									{card.name || card.slug || card.type}
									{versionSuffix}
								</Txt>

								{Boolean(typeName) && (
									<Txt color="text.light" fontSize="0">
										{typeName}
									</Txt>
								)}
							</div>
						)}
					</Flex>
					<Flex alignSelf={['flex-end', 'flex-end', 'flex-start']}>
						{!noActions && (
							<CardActions card={card} inlineActionItems={inlineActionItems}>
								{actionItems}
							</CardActions>
						)}
						<CloseButton
							flex={0}
							mr={-2}
							onClick={props.onClose}
							channel={channel}
						/>
					</Flex>
				</Flex>

				<Markers card={card} />

				{children}
			</Column>
		</LinksProvider>
	);
};

const mapStateToProps = (state): StateProps => {
	return {
		types: selectors.getTypes()(state),
	};
};

export default connect<StateProps, {}, OwnProps>(mapStateToProps)(CardLayout);
