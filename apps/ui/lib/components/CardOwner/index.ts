import { compose } from 'redux';
import { withLink } from '../LinksProvider';
import CardOwner from './CardOwner';

export default compose(withLink('is owned by', 'cardOwner'))(CardOwner) as any;
