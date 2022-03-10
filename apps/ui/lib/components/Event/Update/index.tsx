import { circularDeepEqual } from 'fast-equals';
import React from 'react';
import Wrapper from '../Wrapper';
import Header from '../Header';
import Body from './Body';
import Context from './Context';

const Update = ({ card, actor }: any) => {
	return (
		<Wrapper card={card}>
			<Header card={card}>
				<Context card={card} actor={actor} />
			</Header>
			<Body card={card} />
		</Wrapper>
	);
};

export default React.memo(Update, circularDeepEqual);
