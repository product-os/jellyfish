import _ from 'lodash';
import React from 'react';
import { Select, Badge } from 'rendition';
import styled from 'styled-components';
import { withCardUpdater } from '../../../components';
import * as helpers from '../../../services/helpers';

const SingleLineSpan = styled.span`
	whitespace: 'nowrap';
`;

const SelectWrapper = ({ card, types, onUpdateCard }) => {
	const setValue = ({ option }) => {
		const patch = helpers.patchPath(card, ['data', 'status'], option);
		onUpdateCard(card, patch);
	};

	const label = _.get(card, ['data', 'status']);
	return (
		<Select
			options={types}
			onChange={setValue}
			value={
				<SingleLineSpan>
					<Badge shade={types.indexOf(label)} m={1}>
						{label}
					</Badge>
				</SingleLineSpan>
			}
		>
			{(option, index) => (
				<Badge shade={index} m={1}>
					{option}
				</Badge>
			)}
		</Select>
	);
};

export default withCardUpdater<any>()(SelectWrapper);
