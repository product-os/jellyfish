import type { TypeContract } from '@balena/jellyfish-types/build/core';
import React from 'react';
import _ from 'lodash';
import { Box, BoxProps, Button, Flex, Txt } from 'rendition';
import styled from 'styled-components';
import { Hideable } from '../Hideable';

const HideableBox = Hideable(Box);

const ToggleButton = styled(Button)`
	line-height: 1;
	height: auto;
`;

interface TypeFilterProps extends BoxProps {
	types: TypeContract[];
	onSetType: (type?: TypeContract) => void;
	activeFilter?: TypeContract;
}

export const TypeFilter = ({
	types,
	onSetType,
	activeFilter,
	...props
}: TypeFilterProps) => {
	return (
		<Box {...props} data-test="type-filter__container">
			<Txt mb={1}>
				Filter by type:
				<HideableBox display="inline" isHidden={!activeFilter} ml={2}>
					<Button underline secondary onClick={() => onSetType(undefined)}>
						clear
					</Button>
				</HideableBox>
			</Txt>
			<Flex flexWrap="wrap" mb={2}>
				{types.map((type) => (
					<ToggleButton
						data-test="type-filter__button"
						onClick={() => onSetType(activeFilter === type ? undefined : type)}
						active={activeFilter === type}
						my={1}
						mr={2}
						px={2}
						py={1}
					>
						{type.name}
					</ToggleButton>
				))}
			</Flex>
		</Box>
	);
};
