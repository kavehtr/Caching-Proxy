# Caching-Proxy

This caching proxy server will forward requests to the actual server and cache the responses. If the same request is made again, it will return the cached response instead of forwarding the request to the server.

# How To Install

navigate to the root directory of the project and use this command:

npm install

# How To Use

compile the code with this command :

npm run build

then run with this command :

npm start -- --port <number> --origin <url>

--port is the port on which the caching proxy server will run.
--origin is the URL of the server to which the requests will be forwarded.

# Project URL

https://roadmap.sh/projects/caching-server
