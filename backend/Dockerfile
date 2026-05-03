# Backend Dockerfile
FROM golang:1.26-alpine AS builder

WORKDIR /app
COPY . .
RUN go mod download
RUN go build -o main .

FROM alpine:latest
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /app/main .
RUN chown app:app /app/main
USER app
EXPOSE 8080
CMD ["./main"]
