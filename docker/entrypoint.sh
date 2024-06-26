#!/bin/sh

if [ -d "/pipelines/configurations/example" ]; then
  ld-workbench $@
else
  ld-workbench --init
fi
