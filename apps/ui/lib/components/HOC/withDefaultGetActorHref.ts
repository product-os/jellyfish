import path from 'path';
import { withDefaultProps } from './withDefaultProps';

const getActorHref = (actor: any) => {
	return path.join(location.pathname, actor.card.slug);
};

export const withDefaultGetActorHref = () => {
	return withDefaultProps({
		getActorHref,
	});
};
