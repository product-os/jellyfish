CREATE EXTENSION IF NOT EXISTS hstore;
DO $$
DECLARE
    link_map HSTORE;
    link_names TEXT[];
BEGIN
    link_map = hstore(
        ARRAY['has attached element','is attached to','is creator of','was created by','executes','is executed by'],
        ARRAY['is attached to','has attached element','was created by','is creator of','is executed by','executes']
    );

    -- Clear important bits
    TRUNCATE links2, cards RESTART IDENTITY;

    -- Disable triggers or this will go on for ages
    SET session_replication_role = replica;

    -- Seed 250k user contracts
    RAISE INFO 'Creating user contracts...';
    INSERT INTO cards (id, slug, type, active, version_major, version_minor, version_patch, tags, markers, links, requires, capabilities, data, linked_at, created_at)
    SELECT
        uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        'user-' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        'user@1.0.0',
        random() > .01,
        1,
        0,
        0,
        '{}',
        '{}',
        '{}',
        '{}',
        '{}',
        ('{"hash": "' || md5(random()::text || clock_timestamp()::text) || '", "email": "' || md5(random()::text || clock_timestamp()::text) || '@' || md5(random()::text || clock_timestamp()::text) || '.' || md5(random()::text || clock_timestamp()::text) || '"}')::json,
        '{}',
        (NOW() + (random() * (interval '90 days')) + '30 days')
    FROM generate_series(1, 250000);

    -- Create 1.5 session cards for each user
    RAISE INFO 'Creating session contracts...';
    INSERT INTO cards (id, slug, type, active, version_major, version_minor, version_patch, tags, markers, links, requires, capabilities, data, linked_at, created_at)
    SELECT
        uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        'session-' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        'session@1.0.0',
        random() > .01,
        1,
        0,
        0,
        '{}',
        '{}',
        '{}',
        '{}',
        '{}',
        ('{}')::json,
        '{}',
        (NOW() + (random() * (interval '90 days')) + '30 days')
    FROM generate_series(1, (
        SELECT floor(1.5 * count(*))::int
        FROM cards
        WHERE cards.type = 'user@1.0.0'
    ));

    -- Randomly link sessions to users
    RAISE INFO 'Linking session contracts to user contracts...';
    WITH users AS MATERIALIZED (
        SELECT array_agg(cards.id) AS ids
        FROM cards
        WHERE cards.type = 'user@1.0.0'
        ORDER BY random()
    )
    INSERT INTO links2 (id, forward, fromid, name, toid)
    SELECT
        uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        true,
        users.ids[(random() * (array_length(users.ids, 1) - 1) + 1)::int],
        (SELECT id FROM strings WHERE string='is creator of'),
        cards.id
    FROM cards, users
    WHERE cards.type = 'session@1.0.0';

    WITH users AS MATERIALIZED (
        SELECT array_agg(cards.id) AS ids
        FROM cards
        WHERE cards.type = 'user@1.0.0'
        ORDER BY random()
    )
    INSERT INTO links2 (id, forward, fromid, name, toid)
    SELECT
        uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        false,
        cards.id,
        (SELECT id FROM strings WHERE string='was created by'),
        users.ids[(random() * (array_length(users.ids, 1) - 1) + 1)::int]
    FROM cards, users
    WHERE cards.type = 'session@1.0.0';

    -- Seed 500k thread contracts
    RAISE INFO 'Creating thread contracts...';
    INSERT INTO cards (id, slug, type, active, version_major, version_minor, version_patch, tags, markers, links, requires, capabilities, data, linked_at, created_at)
    SELECT
        uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        'thread-' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        'thread@1.0.0',
        random() > .01,
        1,
        0,
        0,
        '{}',
        '{}',
        '{}',
        '{}',
        '{}',
        ('{}')::json,
        '{}',
        (NOW() + (random() * (interval '90 days')) + '30 days')
    FROM generate_series(1, 500000);

    -- Create 5 message cards for each thread
    RAISE INFO 'Creating messages on threads...';
    WITH users AS MATERIALIZED (
        SELECT array_agg(cards.id) AS ids
        FROM cards
        WHERE cards.type = 'user@1.0.0'
        ORDER BY random()
    )
    INSERT INTO cards (id, slug, type, active, version_major, version_minor, version_patch, tags, markers, links, requires, capabilities, data, linked_at, created_at)
    SELECT
        uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        'message-' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        'message@1.0.0',
        random() > .01,
        1,
        0,
        0,
        '{}',
        '{}',
        '{}',
        '{}',
        '{}',
        ('{"actor": "' || (SELECT users.ids[(random() * (array_length(users.ids, 1) - 1) + 1)::int]) || '", "target": "' || (SELECT users.ids[(random() * (array_length(users.ids, 1) - 1) + 1)::int]) || '", "payload": {"message": "' || md5(random()::text || clock_timestamp()::text) || '"}, "timestamp": "' || (NOW() + (random() * (interval '90 days')) + '30 days')::text || '"}')::json,
        '{}',
        (NOW() + (random() * (interval '90 days')) + '30 days')
    FROM
        generate_series(1, (
            SELECT 5 * count(*)
            FROM cards
            WHERE cards.type = 'thread@1.0.0'
        )),
        users;

    -- Randomly link messages to threads
    RAISE INFO 'Linking messages to threads...';
    WITH threads AS MATERIALIZED (
        SELECT array_agg(threads.id) AS ids
        FROM cards AS threads
        WHERE threads.type = 'thread@1.0.0'
        ORDER BY random()
    )
    INSERT INTO links2 (id, forward, fromid, name, toid)
    SELECT
        uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        true,
        threads.ids[(random() * (array_length(threads.ids, 1) - 1) + 1)::int],
        (SELECT id FROM strings WHERE string='has attached element'),
        cards.id
    FROM cards, threads
    WHERE cards.type = 'message@1.0.0';

    WITH threads AS MATERIALIZED (
        SELECT array_agg(threads.id) AS ids
        FROM cards AS threads
        WHERE threads.type = 'thread@1.0.0'
        ORDER BY random()
    )
    INSERT INTO links2 (id, forward, fromid, name, toid)
    SELECT
        uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        false,
        cards.id,
        (SELECT id FROM strings WHERE string='is attached to'),
        threads.ids[(random() * (array_length(threads.ids, 1) - 1) + 1)::int]
    FROM cards, threads
    WHERE cards.type = 'message@1.0.0';

    -- Seed 1m action-request cards
    RAISE INFO 'Creating action-request contracts...';
    INSERT INTO cards (id, slug, type, active, version_major, version_minor, version_patch, tags, markers, links, requires, capabilities, data, linked_at, created_at)
    SELECT
        uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        'action-request-' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        'action-request@1.0.0',
        random() > .01,
        1,
        0,
        0,
        '{}',
        '{}',
        '{}',
        '{}',
        '{}',
        ('{"actor": "' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring) || '", "epoch": ' || extract(EPOCH FROM (NOW() + (random() * (interval '90 days')) + '30 days'))::integer || ', "input": {"id": "' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring) || '"}, "action": "action-create-card@1.0.0", "context": {"id": "REQUEST-28.0.3-' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring) || '", "api": "SERVER-28.0.3-localhost-' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring) || '"}, "arguments": {"reason": null, "properties": {"data": {"actor": "' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring) || '", "expiration": "' || (NOW() + (random() * (interval '90 days')) + '30 days')::text || '"}, "slug": "session-ui-user-johndoe-' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring) || '", "linked_at": {}}}, "timestamp": "' || (NOW() + (random() * (interval '90 days')) + '30 days')::text || '"}')::json,
        '{}',
        (NOW() + (random() * (interval '90 days')) + '30 days')
    FROM generate_series(1, 1000000);

    -- Create exactly one execute card for each action-request
    RAISE INFO 'Creating execute contracts...';
    INSERT INTO cards (id, slug, type, active, version_major, version_minor, version_patch, tags, markers, links, requires, capabilities, data, linked_at, created_at)
    SELECT
        uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        'execute-' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        'execute@1.0.0',
        random() > .01,
        1,
        0,
        0,
        '{}',
        '{}',
        '{}',
        '{}',
        '{}',
        ('{"actor": "' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring) || '", "target": "' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring) || '", "payload": {"card": "' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring) || '", "data": {"id": "' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring) || '", "slug": "session-ui-user-johndoe-' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring) || '", "type": "session@1.0.0", "version": "1.0.0"}, "error": false, "action": "action-create-card@1.0.0", "timestamp": "' || (NOW() + (random() * (interval '90 days')) + '30 days')::text || '"}, "timestamp": "' || (NOW() + (random() * (interval '90 days')) + '30 days')::text || '"}')::json,
        '{}',
        (NOW() + (random() * (interval '90 days')) + '30 days')
    FROM generate_series(1, (
        SELECT count(*)
        FROM cards
        WHERE cards.type = 'action-request@1.0.0'
    ));

    -- Link execute and action request cards 1-1
    RAISE INFO 'Linking execute contracts to action-request contracts...';
    INSERT INTO links2 (id, forward, fromid, name, toid)
    SELECT
        uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        true,
        pairs.fromid,
        (SELECT id FROM strings WHERE string='executes'),
        pairs.toId
    FROM unnest(
        (
            SELECT array_agg(cards.id)
            FROM cards
            WHERE cards.type = 'execute@1.0.0'
        ),
        (
            SELECT array_agg(cards.id)
            FROM cards
            WHERE cards.type = 'action-request@1.0.0'
        )
    ) AS pairs(fromId, toId);
    INSERT INTO links2 (id, forward, fromid, name, toid)
    SELECT
        uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        false,
        pairs.fromid,
        (SELECT id FROM strings WHERE string='is executed by'),
        pairs.toId
    FROM unnest(
        (
            SELECT array_agg(cards.id)
            FROM cards
            WHERE cards.type = 'action-request@1.0.0'
        ),
        (
            SELECT array_agg(cards.id)
            FROM cards
            WHERE cards.type = 'execute@1.0.0'
        )
    ) AS pairs(fromId, toId);

    -- Create links cards from the links2 table
    RAISE INFO 'Creating link contracts from links2 table...';
    INSERT INTO cards (id, slug, type, active, version_major, version_minor, version_patch, name, tags, markers, links, requires, capabilities, data, linked_at, created_at)
    SELECT
        uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        'link-' || uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
        'link@1.0.0',
        random() > .01,
        1,
        0,
        0,
        (SELECT string FROM strings WHERE id=links2.name),
        '{}',
        '{}',
        '{}',
        '{}',
        '{}',
        ('{"inverseName": "' || (link_map->(SELECT string FROM strings WHERE id=links2.name)) || '", "from": {"id": "' || links2.fromId || '"}, "to": {"id": "' || links2.toId || '"}}')::json,
        '{}',
        (NOW() + (random() * (interval '90 days')) + '30 days')
    FROM links2;

    -- Reenable triggers
    SET session_replication_role = DEFAULT;
END;
$$ LANGUAGE plpgsql;

-- Optimize for benchmark
VACUUM FULL ANALYZE;
