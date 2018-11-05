FROM resinci/jellyfish-test

COPY . ./

# --unsafe-perm flag allows the postinstall script to run correctly
RUN npm ci --unsafe-perm

# Start RethinkDB
RUN rethinkdb --daemon --bind all

# Unit & Integration Testing

# Lint
RUN make lint
# Unit Tests
RUN make test-unit COVERAGE=0
# Integration Tests
RUN make test-integration COVERAGE=0
# Load Production Database Snapshot
RUN node ./scripts/reset-database.js && ./scripts/import-latest-production-backup.sh
# Integration Tests (on production database)
RUN make test-integration-sdk COVERAGE=0 && make test-integration-server COVERAGE=0

# Stress Testing

# Serial Core Inserts
RUN node stress/core/insert-serial.js
# Parallel Core Inserts
RUN node stress/core/insert-parallel.js
# Checkout revious Commit
RUN git checkout HEAD~1 && npm ci
# Serial Core Inserts (previous)
RUN node stress/core/insert-serial.js
# Parallel Core Inserts (previous)
RUN node stress/core/insert-parallel.js
