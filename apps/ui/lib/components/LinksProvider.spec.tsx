import '../../test/ui-setup';
import _ from 'lodash';
import { mount } from 'enzyme';
import React from 'react';
import sinon from 'sinon';
import {
	LinksProvider,
	withLink,
	withLinks,
	useLink,
	useLinks,
} from './LinksProvider';

const sandbox = sinon.createSandbox();

afterEach(async () => {
	sandbox.restore();
});

const user1 = {
	id: 'u1',
	type: 'user@1.0.0',
	slug: 'user-1',
};

const user2 = {
	id: 'u2',
	type: 'user@1.0.0',
	slug: 'user-2',
};

const card = {
	id: 'a1',
	type: 'account@1.0.0',
};

const cardWithOwner = {
	...card,
	links: {
		'has backup owner': [user1],
	},
};

const cardWithOwners = {
	...card,
	links: {
		'has backup owner': [user1, user2],
	},
};

const TestSubscriberInner = () => {
	return <div>Subscriber</div>;
};

test('LinksProvider can be used with withLink', async () => {
	const linkPropName = 'cardOwner';
	const linkVerb = 'has backup owner';
	const TestSubscriber = withLink(linkVerb, linkPropName)(TestSubscriberInner);
	const sdk = {
		card: {
			getWithLinks: sandbox.fake.resolves(cardWithOwner),
		},
	};

	const provider = await mount(
		<LinksProvider sdk={sdk} cards={[card]} link={linkVerb}>
			<TestSubscriber card={card} />
		</LinksProvider>,
	);

	provider.update();

	expect(sdk.card.getWithLinks.calledOnce).toBe(true);
	expect(sdk.card.getWithLinks.getCall(0).args).toEqual([card.id, linkVerb]);
	const subscriber: any = provider.find('TestSubscriberInner');
	expect(subscriber.props()[linkPropName]).toEqual(user1);
	expect(_.isFunction(subscriber.props().updateCardOwnerCache)).toBe(true);
});

test('LinksProvider can be used with withLinks', async () => {
	const linksPropName = 'cardOwners';
	const linkVerb = 'has backup owner';
	const TestSubscriber = withLinks(
		linkVerb,
		linksPropName,
	)(TestSubscriberInner);
	const sdk = {
		card: {
			getWithLinks: sandbox.fake.resolves(cardWithOwners),
		},
	};

	const provider = await mount(
		<LinksProvider sdk={sdk} cards={[card]} link={linkVerb}>
			<TestSubscriber card={card} />
		</LinksProvider>,
	);

	provider.update();

	expect(sdk.card.getWithLinks.calledOnce).toBe(true);
	expect(sdk.card.getWithLinks.getCall(0).args).toEqual([card.id, linkVerb]);
	const subscriber: any = provider.find('TestSubscriberInner');
	expect(subscriber.props()[linksPropName]).toEqual([user1, user2]);
	expect(_.isFunction(subscriber.props().updateCardOwnersCache)).toBe(true);
});

test('LinksProvider can be used with useLink', async () => {
	const linkPropName = 'cardOwner';
	const linkVerb = 'has backup owner';
	const sdk = {
		card: {
			getWithLinks: sandbox.fake.resolves(cardWithOwner),
		},
	};

	const subscriberSpy = sandbox.stub();

	const TestHooksSubscriber = () => {
		const ctx = useLink(linkVerb, card.id, linkPropName);
		subscriberSpy(ctx);
		return <div>Subscriber</div>;
	};

	await mount(
		<LinksProvider sdk={sdk} cards={[card]} link={linkVerb}>
			{/* @ts-ignore */}
			<TestHooksSubscriber card={card} />
		</LinksProvider>,
	);

	expect(sdk.card.getWithLinks.calledOnce).toBe(true);
	expect(sdk.card.getWithLinks.getCall(0).args).toEqual([card.id, linkVerb]);

	const context = subscriberSpy.getCall(subscriberSpy.callCount - 1).lastArg;

	expect(context.cardOwner).toEqual(user1);
	expect(_.isFunction(context.updateCardOwnerCache)).toBe(true);
});

test('LinksProvider can be used with useLinks', async () => {
	const linksPropName = 'cardOwners';
	const linkVerb = 'has backup owner';
	const sdk = {
		card: {
			getWithLinks: sandbox.fake.resolves(cardWithOwners),
		},
	};

	const subscriberSpy = sandbox.stub();

	const TestHooksSubscriber = () => {
		const ctx = useLinks(linkVerb, card.id, linksPropName);
		subscriberSpy(ctx);
		return <div>Subscriber</div>;
	};

	await mount(
		<LinksProvider sdk={sdk} cards={[card]} link={linkVerb}>
			{/* @ts-ignore */}
			<TestHooksSubscriber card={card} />
		</LinksProvider>,
	);

	expect(sdk.card.getWithLinks.calledOnce).toBe(true);
	expect(sdk.card.getWithLinks.getCall(0).args).toEqual([card.id, linkVerb]);

	const context = subscriberSpy.getCall(subscriberSpy.callCount - 1).lastArg;

	expect(context.cardOwners).toEqual([user1, user2]);
	expect(_.isFunction(context.updateCardOwnersCache)).toBe(true);
});
