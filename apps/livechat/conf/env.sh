#!/bin/bash

# Injecting environment variables using a shell script allows the Livechat docker
# container to be parameterised at runtime, which means we can create a single
# Livechat container and point it at different backends as required.
# This is very useful for testing, where we build containers (that may be
# deployed to production) and also test these containers in CI.
# For a more in-depth explanation of this approach take a look at:
# https://www.freecodecamp.org/news/how-to-implement-runtime-environment-variables-with-create-react-app-docker-and-nginx-7f9d42a91d70/

echo "Generating env-config.js file..."

BASE_FILENAME="env-config.js"
PUBLIC_DIR="/usr/share/nginx/html"

# Recreate config file
rm -rf "./$BASE_FILENAME"
touch "./$BASE_FILENAME"

{
	echo "window._env_ = {"

	# Append configuration property to JS file
	echo "  SERVER_HOST: \"$SERVER_HOST\","
	echo "  SERVER_PORT: \"$SERVER_PORT\","
	echo "  SENTRY_DSN_UI: \"$SENTRY_DSN_UI\","

	echo "}"
} >> "./$BASE_FILENAME"

HASHED_FILENAME="env-config.$(md5sum "./$BASE_FILENAME" | cut -f1 -d" ").js"
mv "./$BASE_FILENAME" "$PUBLIC_DIR/$HASHED_FILENAME"

echo "$HASHED_FILENAME file generated:"
cat "$PUBLIC_DIR/$HASHED_FILENAME"

sed -i "s/${BASE_FILENAME}/${HASHED_FILENAME}/" "$PUBLIC_DIR/index.html"
