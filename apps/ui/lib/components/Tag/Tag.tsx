import React from 'react';
import { Button, Txt, Theme, TxtProps } from 'rendition';
import styled from 'styled-components';
import { px } from '../../services/helpers';
import Icon from '../Icon';

export const tagStyle = `
	display: inline-flex;
	background: #efefef;
	padding: 2px 5px 1px;
	border-radius: ${Theme.radius}px;
	border: 1px solid #c3c3c3;
	line-height: 1;
	max-width: 180px;
	position: relative;

	> a {
		flex: 1;
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	}
`;

interface StyledTagProps extends TxtProps {
	hasRemoveButton: boolean;
}

const StyledTag = styled<React.FunctionComponent<StyledTagProps>>(Txt.span)`
	${tagStyle}
	${(props) => {
		return props.hasRemoveButton
			? `padding-right: ${px(props.theme.space[3])} !important;`
			: '';
	}}
`;

const StyledRemoveButton = styled(Button).attrs({
	plain: true,
})`
	position: absolute;
	right: 3px;
	cursor: default;
	color: ${(props) => {
		return props.theme.colors.tertiary.main;
	}};
`;

export const TAG_SYMBOL = '#';

export interface TagProps extends Omit<StyledTagProps, 'hasRemoveButton'> {
	onRemove?: () => void;
}

export default function Tag({
	children,
	onRemove,
	...rest
}: React.PropsWithChildren<TagProps>) {
	let content = children;

	if (
		content &&
		typeof content === 'string' &&
		!content.startsWith(TAG_SYMBOL)
	) {
		content = `${TAG_SYMBOL}${content}`;
	}

	const handleRemoveButtonClick = React.useCallback(
		(event) => {
			event.preventDefault();
			onRemove!();
		},
		[onRemove],
	);

	const hasRemoveButton = Boolean(onRemove);

	const confirmation = React.useMemo(() => {
		return {
			placement: 'bottom',
			text: 'Are you sure?',
		};
	}, []);

	return (
		<StyledTag {...rest} hasRemoveButton={hasRemoveButton}>
			{content}
			{hasRemoveButton && (
				<StyledRemoveButton
					// @ts-ignore
					confirmation={confirmation}
					onClick={handleRemoveButtonClick}
				>
					<Icon name="times" />
				</StyledRemoveButton>
			)}
		</StyledTag>
	);
}
