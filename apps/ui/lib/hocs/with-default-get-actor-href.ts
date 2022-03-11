import path from 'path';
import { withDefaultProps } from './with-default-props';

const getActorHref = (actor: any) => {
	return path.join(location.pathname, actor.card.slug);
};

export const withDefaultGetActorHref = () => {
	return withDefaultProps({
		getActorHref,
	});
};
