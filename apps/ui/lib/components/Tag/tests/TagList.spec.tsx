import { getWrapper } from '../../../../test/ui-setup';
import { shallow, mount } from 'enzyme';
import React from 'react';
import { TagList } from '../';

const wrappingComponent = getWrapper().wrapper;

test('Tags are filtered if they appear in the blacklist', () => {
	const tagList = shallow(
		<TagList tags={['tag1', 'tag2']} blacklist={['tag1']} />,
	);
	const tags = tagList.find('Tag');
	expect(tags.length).toBe(1);

	// Note: because this is a shallow render, the child of the Tag doesn't have the # prefix yet
	expect(tags.at(0).children().text()).toBe('tag2');
});

test('Tags are automatically prefixed with a hashtag', () => {
	const tagList = mount(<TagList tags={['#tag1', 'tag2']} />, {
		wrappingComponent,
	});
	const tags = tagList.find('Tag');
	expect(tags.length).toBe(2);
	expect(tags.at(0).children().text()).toBe('#tag1');
	expect(tags.at(1).children().text()).toBe('#tag2');
});

test('#tag1 and tag1 are considered the same and de-duplicated', () => {
	const tagList = shallow(<TagList tags={['tag1', '#tag1']} />);
	const tags = tagList.find('Tag');
	expect(tags.length).toBe(1);
});
