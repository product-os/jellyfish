/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import styled from 'styled-components';

export interface HideableProps {
	isHidden?: boolean;
}

export const Hideable = (Component) => styled(Component)<HideableProps>`
	opacity: ${(props) => (props.isHidden ? 0 : 1)};
	transition: opacity ease-in-out 300ms;
`;
