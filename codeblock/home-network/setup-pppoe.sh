#!/bin/env sh

# interface to pppoe workload
INTERFACE=enp1s0

if [ "${IFACE}" = "${INTERFACE}" ] ; then
    echo "running pon ${INTERFACE}..."
    pon dsl-provider
fi