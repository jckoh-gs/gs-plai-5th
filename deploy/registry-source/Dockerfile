# Source and toolchain are immutable; the runtime contains only static binaries and CA roots.
FROM --platform=$BUILDPLATFORM golang:1.27.1-alpine3.23@sha256:96a6b037cd95ee2d72dc63fec59ad8250110fe795111d783d97aa980ec59ec32 AS build
WORKDIR /src
ADD https://codeload.github.com/distribution/distribution/tar.gz/9a8d98b679740cd514aa7e7d84d23d442a5ef54c /tmp/source.tar.gz
RUN echo 'db8d38f341b7699e516eaa33986814cce3276e75d1df4ac6f77d60e58c688c45  /tmp/source.tar.gz' | sha256sum -c - && tar -xzf /tmp/source.tar.gz --strip-components=1 -C /src
ENV CGO_ENABLED=0 GOFLAGS=-mod=mod GOTOOLCHAIN=local
COPY security-upgrades.txt /tmp/security-upgrades.txt
RUN xargs go get < /tmp/security-upgrades.txt && go mod tidy
COPY compatibility-upgrades.txt /tmp/compatibility-upgrades.txt
RUN xargs go get < /tmp/compatibility-upgrades.txt && go mod tidy
RUN go test -timeout 90s ./configuration ./registry/storage/driver/filesystem ./registry/api/v2
ARG TARGETARCH=amd64
RUN GOOS=linux GOARCH=$TARGETARCH go build -trimpath -ldflags '-s -w -X github.com/distribution/distribution/v3/version.version=3.1.1-grid-sec1 -X github.com/distribution/distribution/v3/version.revision=9a8d98b679740cd514aa7e7d84d23d442a5ef54c' -o /out/registry ./cmd/registry
COPY healthcheck.go /tmp/healthcheck.go
RUN GOOS=linux GOARCH=$TARGETARCH go build -trimpath -ldflags '-s -w' -o /out/healthcheck /tmp/healthcheck.go
RUN mkdir -p /out/data && cp go.mod go.sum /out/
FROM scratch AS locks
COPY --from=build /out/go.mod /out/go.sum /
FROM scratch
LABEL org.opencontainers.image.source="https://github.com/distribution/distribution" org.opencontainers.image.revision="9a8d98b679740cd514aa7e7d84d23d442a5ef54c" org.opencontainers.image.version="3.1.1-grid-sec1"
COPY --from=build /src/LICENSE /LICENSE
COPY --from=build /out/registry /registry
COPY --from=build /out/healthcheck /healthcheck
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build --chown=1000:1000 /out/data /var/lib/registry
COPY config.yml /etc/distribution/config.yml
ENV OTEL_TRACES_EXPORTER=none OTEL_METRICS_EXPORTER=none OTEL_LOGS_EXPORTER=none
USER 1000:1000
ENTRYPOINT ["/registry"]
CMD ["serve", "/etc/distribution/config.yml"]
