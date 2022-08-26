#!/bin/bash

if [[ $SUT -eq 1 ]]
then 
  echo "SUT, running /usr/bin/entry.sh"
  exec /usr/bin/entry.sh
else
  echo "No SUT, sleeping"
  /bin/sleep infinity
fi