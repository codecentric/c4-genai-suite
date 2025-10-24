FROM python:3.14-alpine3.22

# we need this for extracting audio streams from videos and handeling office formats
RUN apk add --no-cache \
    ffmpeg=6.1.2-r2 \
    libreoffice-calc=25.2.5.2-r0 \
    libreoffice-impress=25.2.5.2-r0 \
    libreoffice-writer=25.2.5.2-r0
# Install fonts for pdf generation
RUN apk --no-cache add \
    msttcorefonts-installer=3.8.1-r1 \
    fontconfig=2.15.0-r3 \
    font-droid-nonlatin=20200215-r4 \
    font-droid=20200215-r4 \
    ttf-dejavu=2.37-r6 \
    ttf-freefont=20120503-r4 \
    ttf-liberation=2.1.5-r2 && \
    update-ms-fonts && \
    fc-cache -f
