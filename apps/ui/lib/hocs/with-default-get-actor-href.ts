import path from 'path';
import { UIActor } from '../types';
import { withDefaultProps } from './with-default-props';

const getActorHref = (actor: UIActor) => {
	return path.join(location.pathname, actor.card.slug);
};

export const withDefaultGetActorHref = () => {
	return withDefaultProps({
		getActorHref,
	});
};
