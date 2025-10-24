FROM python:3.14-alpine3.22 AS builder

RUN apk add --no-cache build-base=0.5-r3 linux-headers=6.14.2-r0 rust=1.87.0-r0 cargo=1.87.0-r0

RUN pip install poetry