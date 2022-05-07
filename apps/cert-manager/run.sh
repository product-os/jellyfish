#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -ae

[[ $VERBOSE =~ on|On|Yes|yes|true|True ]] && set -x

# We don't want any keys
rm -f /opt/keys.json

cat << EOF > /opt/certs.json
[
	{
		"request": {
			"key": {
				"algo": "\${key_algo}",
				"size": \${key_size}
			},
			"hosts": \${hosts},
			"names": [
				{
					"C": "\${country}",
					"L": "\${locality_name}",
					"O": "\${org}",
					"OU": "\${org_unit}",
					"ST": "\${state}"
				}
			],
			"CN": "\${TLD}"
		}
	},
	{
		"request": {
			"key": {
			"algo": "\${key_algo}",
			"size": \${key_size}
			},
			"hosts": [
				"api.\${TLD}"
			],
			"names": [
				{
					"C": "\${country}",
					"L": "\${locality_name}",
					"O": "\${org}",
					"OU": "\${org_unit}",
					"ST": "\${state}"
				}
			],
			"CN": "api.\${TLD}"
		}
	}
]
EOF

exec /usr/local/bin/entry.sh "$@"
