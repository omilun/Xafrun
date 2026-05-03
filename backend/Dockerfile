# Backend Dockerfile
# Cross-compiles natively via Go's built-in cross-compilation (CGO disabled).
# No QEMU required — works fast on any host arch for linux/amd64 and linux/arm64.
FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o main .

FROM alpine:latest
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /app/main .
RUN chown app:app /app/main
USER app
EXPOSE 8080
CMD ["./main"]
