# Specify the Node.js version to use
ARG NODE_VERSION=22

# Specify the Debian version to use, the default is "bullseye"
ARG DEBIAN_VERSION=bullseye

# Resolve the runtime dependencies on their own, with the dev tree deleted first.
# Doing it this way (instead of `yarn install --production`, which just deletes the
# dev packages from a tree hoisted for dev) means the versions hoisted to the top of
# node_modules are the ones Astro's compiled server actually asks for
FROM node:${NODE_VERSION}-${DEBIAN_VERSION} AS deps

WORKDIR /app

# Chromium is installed from apt in the final stage, so skip Puppeteer's own download
ENV PUPPETEER_SKIP_DOWNLOAD='true'

COPY package.json yarn.lock ./

# Versions still come from the lockfile, --pure-lockfile only stops yarn rewriting it,
# since dropping the dev dependencies would otherwise count as a lockfile change
RUN npm pkg delete devDependencies && \
    yarn install --pure-lockfile --network-timeout 100000 && \
    rm -rf /app/node_modules/.cache

# Use Node.js Docker image as the base image, with specific Node and Debian versions
FROM node:${NODE_VERSION}-${DEBIAN_VERSION} AS build

# Set the container's default shell to Bash and enable some options
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

# Install Chromium browser and Download and verify Google Chrome's signing key
RUN apt-get update -qq --fix-missing && \
    apt-get -qqy install --allow-unauthenticated gnupg wget && \
    wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list && \
    apt-get update -qq && \
    apt-get -qqy --no-install-recommends install chromium traceroute python make g++ && \
    rm -rf /var/lib/apt/lists/*

# Run the Chromium browser's version command and redirect its output to the /etc/chromium-version file
RUN /usr/bin/chromium --no-sandbox --version > /etc/chromium-version

# Set the working directory to /app
WORKDIR /app

# Nothing in the build needs a browser, so skip Puppeteer's download here too
ENV PUPPETEER_SKIP_DOWNLOAD='true'

# Copy package.json and yarn.lock to the working directory
COPY package.json yarn.lock ./

# Run yarn install to install dependencies and clear yarn cache
RUN yarn install --frozen-lockfile --network-timeout 100000 && \
    rm -rf /app/node_modules/.cache

# Copy all files to working directory
COPY . .

# Run yarn build to build the application
RUN yarn build --production

# Final stage
FROM node:${NODE_VERSION}-${DEBIAN_VERSION}  AS final

WORKDIR /app

# Only what's needed to serve the app: the runtime deps, compiled site, API and server
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/api ./api
COPY --from=build /app/public ./public
COPY --from=build /app/server.js /app/package.json /app/yarn.lock ./

RUN apt-get update && \
    apt-get install -y --no-install-recommends chromium traceroute && \
    chmod 755 /usr/bin/chromium && \
    rm -rf /var/lib/apt/lists/*

# Load the compiled server, so a dependency missing from the runtime tree fails
# the build here, rather than degrading to the "not compiled" page at runtime
RUN node --input-type=module -e "await import('/app/dist/server/entry.mjs');"

# Exposed container port, the default is 3000, which can be modified through the environment variable PORT
EXPOSE ${PORT:-3000}

# Point Chromium-using libs at the system binary, skip puppeteer's bundled download
ENV CHROME_PATH='/usr/bin/chromium' \
    PUPPETEER_EXECUTABLE_PATH='/usr/bin/chromium' \
    PUPPETEER_SKIP_DOWNLOAD='true'

LABEL org.opencontainers.image.title="Web-Check" \
      org.opencontainers.image.description="All-in-one OSINT tool for analysing any website" \
      org.opencontainers.image.url="https://web-check.xyz" \
      org.opencontainers.image.source="https://github.com/lissy93/web-check" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="Alicia Sykes"

# Define the command executed when the container starts and start the server.js of the Node.js application
CMD ["yarn", "start"]
