/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as React from 'react';

interface IfProps {
	condition: boolean;
	children: any;
}

export const If = ({ condition, children }: IfProps) => {
	if (condition) {
		return (
			<React.Fragment>
				{children}
			</React.Fragment>
		);
	}

	return null;
};
