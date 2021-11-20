import React from 'react';
import _ from 'lodash';
import { Box, BoxProps, Button, ButtonGroup } from 'rendition';
import { Icon } from '@balena/jellyfish-ui-components';
import { LensContract } from '../../../../types';

// HACK: set min height to the height of a button group
// this prevents the component collapsing vertically if
// there are no lenses provided.
const MIN_HEIGHT = '38px';

interface LensSelectionProps extends BoxProps {
	lenses: LensContract[];
	lens: LensContract;
	setLens: React.MouseEventHandler<HTMLButtonElement>;
}

export const LensSelection = ({
	lenses,
	lens,
	setLens,
	...rest
}: LensSelectionProps) => {
	return (
		<Box {...rest} minHeight={MIN_HEIGHT}>
			{lenses.length > 1 && (
				<ButtonGroup>
					{_.map(lenses, (item) => {
						return (
							<Button
								key={item.slug}
								active={lens && lens.slug === item.slug}
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
