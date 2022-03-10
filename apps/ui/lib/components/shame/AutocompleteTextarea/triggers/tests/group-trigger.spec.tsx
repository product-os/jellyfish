import sinon from 'sinon';
import groupTrigger from '../group-trigger';
import { getComponentFromTrigger, getOutputFromTrigger } from './helpers';

const TAG = '@@';
const GROUP_NAME = 'fake-group';

const sandbox = sinon.createSandbox();

let context: any = {};

beforeEach(() => {
	context = {
		...context,
		sdk: {
			query: sandbox.stub(),
		},
	};
});

afterEach(() => {
	sandbox.restore();
});

test('The correct tag is returned in the component and output of the group trigger', async () => {
	const { sdk } = context;

	sdk.query.resolves([
		{
			name: GROUP_NAME,
		},
	]);

	const atTag = '@@';
	const atTrigger = await groupTrigger(sdk, atTag);
	const atDiv = await getComponentFromTrigger(atTrigger, atTag, GROUP_NAME);
	const atOutput = await getOutputFromTrigger(atTrigger, atTag, GROUP_NAME);
	expect(atDiv.props.children).toBe(`${atTag}${GROUP_NAME}`);
	expect(atOutput).toBe(`${atTag}${GROUP_NAME}`);

	const exclamationTag = '!!';
	const exclamationTrigger = await groupTrigger(sdk, exclamationTag);
	const exclamationDiv = await getComponentFromTrigger(
		exclamationTrigger,
		exclamationTag,
		GROUP_NAME,
	);
	const exclamationOutput = await getOutputFromTrigger(
		exclamationTrigger,
		exclamationTag,
		GROUP_NAME,
	);
	expect(exclamationDiv.props.children).toBe(`${exclamationTag}${GROUP_NAME}`);
	expect(exclamationOutput).toBe(`${exclamationTag}${GROUP_NAME}`);
});

test('A group matching the search term is displayed by its name', async () => {
	const { sdk } = context;

	sdk.query.resolves([
		{
			name: GROUP_NAME,
		},
	]);

	const trigger = await groupTrigger(sdk, TAG);
	const div = await getComponentFromTrigger(trigger, TAG, GROUP_NAME);
	expect(div.props.children).toBe(`${TAG}${GROUP_NAME}`);
});

test('A group is outputted as the tag plus its name', async () => {
	const { sdk } = context;

	sdk.query.resolves([
		{
			name: GROUP_NAME,
		},
	]);

	const trigger = await groupTrigger(sdk, TAG);
	const output = await getOutputFromTrigger(trigger, TAG, GROUP_NAME);
	expect(output).toBe(`${TAG}${GROUP_NAME}`);
});
