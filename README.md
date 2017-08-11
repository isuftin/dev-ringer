# Predev Proxy
A developer tool to use the services on predev, while running the ui code
locally.

## Setting up
This project uses self signed certs to run locally over https. Before you
can run the server, you need to generate them.
```
npm run gen-cert
```

## How to use
Pull down and make changes in `uw-frame`, then build so they can be used in
`angularjs-portal`
```
cd uw-frame
cd uw-frame-java
mvn clean install
```

Run your `angularjs-portal`
```
cd angularjs-portal
npm start
```

Start the predev-proxy
```
cd predev-proxy
npm start
```

Direct your browser to [http://localhost:8081]() or [https://localhost:8443]()