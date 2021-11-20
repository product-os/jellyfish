import '../../../../../test/ui-setup';
import { shallow } from 'enzyme';
import React from 'react';
import CRMTable from '../CRMTable';
import props from './fixtures/props.json';

const { channel, tail, page, totalPages, type, user, allTypes } = props as any;

describe('CRMTable lens', () => {
	test('should render', () => {
		expect(() => {
			shallow(
				<CRMTable
					channel={channel}
					tail={tail}
					page={page}
					totalPages={totalPages}
					type={type}
					user={user}
					allTypes={allTypes}
					lensState={{}}
				/>,
			);
		}).not.toThrow();
	});
});
