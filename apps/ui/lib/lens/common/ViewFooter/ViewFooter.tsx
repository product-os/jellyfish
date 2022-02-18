import React from 'react';
import { Flex, DropDownButton, Button } from 'rendition';
import styled from 'styled-components';
import { ActionLink, Icon } from '@balena/jellyfish-ui-components';

const Footer = styled(Flex)`
	border-top: 1px solid #eee;
`;

const DropUpButton = styled(DropDownButton).attrs({
	dropUp: true,
})`
	& > div:last-child {
		max-height: 80vh;
	}
`;
const isSynchronous = (type) => {
	return type.slug === 'thread';
};

const ButtonLabel: any = ({ type, isBusy }) => {
	return isBusy ? <Icon spin name="cog" /> : `Add ${type.name || type.slug}`;
};

export const ViewFooter: React.FunctionComponent<any> = ({
	channel,
	types,
	actions,
	...rest
}) => {
	const [isBusy, setIsBusy] = React.useState(false);

	const handleButtonClick = React.useCallback(
		(event) => {
			event.preventDefault();
			event.stopPropagation();
			onAddCard(types[0]);
		},
		[types],
	);

	const onAddCard = React.useCallback(
		async (type) => {
			setIsBusy(true);
			await actions.addCard(channel, type, {
				synchronous: isSynchronous(type),
			});
			setIsBusy(false);
		},
		[actions.addCard, channel, types],
	);

	return (
		<Footer flex={0} p={3} {...rest} justifyContent="flex-end">
			{types.length > 1 ? (
				<DropUpButton
					alignRight
					disabled={isBusy}
					success
					data-test="viewfooter__add-dropdown"
					onClick={handleButtonClick}
					label={<ButtonLabel isBusy={isBusy} type={types[0]} />}
				>
					{types.slice(1).map((type) => (
						<ActionLink
							key={type.slug}
							data-test={`viewfooter__add-link--${type.slug}`}
							onClick={() => {
								onAddCard(type);
							}}
						>
							Add {type.name || type.slug}
						</ActionLink>
					))}
				</DropUpButton>
			) : (
				<Button
					disabled={isBusy}
					success
					data-test={`viewfooter__add-btn--${types[0].slug}`}
					onClick={() => {
						onAddCard(types[0]);
					}}
				>
					<ButtonLabel isBusy={isBusy} type={types[0]} />
				</Button>
			)}
		</Footer>
	);
};
