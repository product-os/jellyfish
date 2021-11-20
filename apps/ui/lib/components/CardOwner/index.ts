import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import { withLink } from '@balena/jellyfish-ui-components';
import CardOwner from './CardOwner';

export default compose(
	withRouter,
	withLink('is owned by', 'cardOwner'),
)(CardOwner) as any;
