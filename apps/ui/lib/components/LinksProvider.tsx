import React from 'react';
import _ from 'lodash';
import Bluebird from 'bluebird';
import update from 'immutability-helper';
import { supportsLink } from '@balena/jellyfish-client-sdk';
const linksContext = React.createContext<any>(null);

// LinksProvider asynchronously fetches the requested links and stores them in React context
// so they are available for use by child components that subscribe to the context.
// Note: currently you can request links for multiple cards but only a single link verb is supported
// by an instance of LinksProvider.

export const LinksProvider = ({ sdk, cards, link, children }: any) => {
	const [links, setLinks] = React.useState({});

	const updateLinks = (cardId: string, linkVerb: string, newLinks: any) => {
		setLinks(
			update(links, {
				[cardId]: (linksByCard: any) => {
					return update(linksByCard || {}, {
						[linkVerb]: (linksByVerb: any) => {
							return update(linksByVerb || [], {
								$set: newLinks,
							});
						},
					});
				},
			}),
		);
	};

	const fetchLinks = async () => {
		const actions = _.filter(cards, (card) => {
			return supportsLink(card.type, link);
		}).map((card) => {
			return sdk.card.getWithLinks(card.id, link).then((cardWithLinks: any) => {
				const fetchedLinks = _.get(cardWithLinks, ['links', link]);
				if (fetchedLinks) {
					updateLinks(card.id, link, fetchedLinks);
				}
				return true;
			});
		});
		await Bluebird.all(actions);
	};

	React.useEffect(() => {
		// Reset the links and then asynchronously fetch them
		setLinks({});
		if (_.get(cards, ['length'])) {
			fetchLinks();
		}
	}, [_.join(_.map(cards, 'id'), '_'), link]);

	const value = {
		links,
		updateLinks,
	};
	return (
		<linksContext.Provider value={value}>{children}</linksContext.Provider>
	);
};

const capitalizeFirst = (str: string) => {
	return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
};

const getSingleLinkSubscriberProps = (
	context: any,
	linkVerb: any,
	linkPropName: any,
	cardId: any,
) => {
	const updateLinkPropName = `update${capitalizeFirst(linkPropName)}Cache`;
	return {
		[linkPropName]: _.get(context, ['links', cardId, linkVerb, 0], null),
		[updateLinkPropName]: (newLink: any) => {
			return context.updateLinks(cardId, linkVerb, [newLink]);
		},
	};
};

const getMultipleLinksSubscriberProps = (
	context: any,
	linkVerb: any,
	linksPropName: any,
	cardId: any,
) => {
	const updateLinksPropName = `update${capitalizeFirst(linksPropName)}Cache`;
	return {
		[linksPropName]: _.get(context, ['links', cardId, linkVerb], null),
		[updateLinksPropName]: (newLinks: any) => {
			return context.updateLinks(cardId, linkVerb, newLinks);
		},
	};
};

// ############################################################################
// HOCs
// Use these React Context consumer higher order components to wrap class
// components that use the linked cards provided by LinksProvider.

export const withLink = (linkVerb: any, linkPropName = 'link') => {
	return (Component: any) => {
		return (props: any) => {
			return (
				<linksContext.Consumer>
					{(context) => {
						const linkSubscriberProps = getSingleLinkSubscriberProps(
							context,
							linkVerb,
							linkPropName,
							props.card.id,
						);
						return <Component {...props} {...linkSubscriberProps} />;
					}}
				</linksContext.Consumer>
			);
		};
	};
};

export const withLinks = (linkVerb: any, linksPropName = 'links') => {
	return (Component: any) => {
		return (props: any) => {
			return (
				<linksContext.Consumer>
					{(context) => {
						const subscriberLinkProps = getMultipleLinksSubscriberProps(
							context,
							linkVerb,
							linksPropName,
							props.card.id,
						);
						return <Component {...props} {...subscriberLinkProps} />;
					}}
				</linksContext.Consumer>
			);
		};
	};
};

// ############################################################################
// Hooks
// Use these custom hooks (that internally use the React.useContext hook) in
// functional components that use the linked cards provided by LinksProvider.

export const useLink = (linkVerb: any, cardId: any, linkPropName = 'link') => {
	const context = React.useContext(linksContext);
	return getSingleLinkSubscriberProps(context, linkVerb, linkPropName, cardId);
};

export const useLinks = (
	linkVerb: any,
	cardId: any,
	linksPropName = 'links',
) => {
	const context = React.useContext(linksContext);
	return getMultipleLinksSubscriberProps(
		context,
		linkVerb,
		linksPropName,
		cardId,
	);
};
