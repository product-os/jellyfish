import * as React from 'react'
import { useSelector } from 'react-redux';
import { v4 as uuid } from 'uuid';
import { Icon, PlainButton, useSetup } from '@balena/jellyfish-ui-components'
import type { core, JSONSchema } from '@balena/jellyfish-types';
import { selectors } from '../../../core';

export const StarButton = ({
    card,
    ...rest
}) => {
    const { sdk } = useSetup()!;
    const [ loading, setLoading ] = React.useState(true);
    const [ starred, setStarred ] = React.useState(false);
    const currentUser = useSelector<any, core.UserContract>(
		selectors.getCurrentUser,
	);

    React.useEffect(() => {
        let stream: any = null;

        (async () => {
            const query: JSONSchema = {
                type: 'object',
                required: [ 'id' ],
                properties: {
                    id: {
                        const: card.id
                    }
                },
                $$links: {
                    'is starred by': {
                        type: 'object',
                        required: [ 'id' ],
                        properties: {
                            id: {
                                const: currentUser.id
                            }
                        }
                    }
                }
            }

            stream = await sdk.stream(query);
            setLoading(true)

			stream.on('dataset', ({ data: { cards } }) => {
                setLoading(false);
                setStarred(cards.length > 0);
			});

			stream.on('update', ({ data: { after } }) => {
				if (after) {
					setStarred(true);
				} else {
					setStarred(false);
				}
			});

			stream.emit('queryDataset', {
				id: uuid(),
				data: {
					schema: query,
				},
			});
        })()

        return () => {
			if (stream) {
				stream.close();
			}
		};
    }, [sdk, currentUser.id])

    const handleClick = React.useCallback(async () => {
        setStarred(!starred)
        try {
            if (starred) {
                await sdk.card.unlink(currentUser, card, 'starred')
            } else {
                await sdk.card.link(currentUser, card, 'starred')
            }
        } catch (err) {
            setStarred(starred)
        }
    }, [ starred, sdk, currentUser, card ])

    if (loading) {
        return null;
    }

    return (
        <PlainButton
            tooltip={{
                placement: 'bottom',
                text: starred ? 'Unstar' : 'Star',
            }}
            icon={(
                <Icon name="star" style={{ opacity: starred ? 1 : .5 }} />
            )}
            onClick={handleClick}
            {...rest}
        />
    )
}
