FROM node:8.5.0-alpine

MAINTAINER Mr. David Sibobbabley

RUN npm install -g dev-ringer

CMD [ "ringer", "-H", "/docs/examples/example.har.json", "-o", "/docs/examples/example.drp.json" ]