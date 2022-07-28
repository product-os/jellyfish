import React from 'react';
import _ from 'lodash';
import { Box, BoxProps, Button, ButtonGroup } from 'rendition';
import { Icon } from '../../../../components';
import type { LensContract } from '../../../../types';
import styled from 'styled-components';

// HACK: set min height to the height of a button group
// this prevents the component collapsing vertically if
// there are no lenses provided.
const MIN_HEIGHT = '28px';

const StyledButton = styled(Button)`
	height: 28px;
	padding-bottom: 9px;
`;

interface LensSelectionProps extends BoxProps {
	lenses: LensContract[];
	lens: LensContract | null;
	setLens: React.MouseEventHandler<HTMLButtonElement>;
}

export const LensSelection = ({
	lenses,
	lens,
	setLens,
	...rest
}: LensSelectionProps) => {
	const activeLens =
		(lens && _.find(lenses, { slug: lens.slug })) || lenses![0];
	return (
		<Box {...rest} minHeight={MIN_HEIGHT}>
			{lenses.length > 1 && (
				<ButtonGroup>
					{_.map(lenses, (item) => {
						return (
							<StyledButton
								key={item.slug}
								active={activeLens && activeLens.slug === item.slug}
								data-test={`lens-selector--${item.slug}`}
								data-slug={item.slug}
								onClick={setLens}
								pt={11}
								tooltip={{
									text: _.get(item, ['data', 'label'], ''),
									placement: 'bottom',
								}}
								icon={<Icon name={item.data.icon} />}
							/>
						);
					})}
				</ButtonGroup>
			)}
		</Box>
	);
};
