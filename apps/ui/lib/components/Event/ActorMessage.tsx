import React from 'react';
import Space from '../Space';

const ActorMessage = ({ actor, suffix }: any) => {
	if (actor && actor.name) {
		return (
			<span>
				<strong>{actor.name}</strong>
				<Space />
				{suffix}
			</span>
		);
	}
	return <span>{suffix}</span>;
};

export default React.memo(ActorMessage);
