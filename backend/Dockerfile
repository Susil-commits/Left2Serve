# Multi-stage Go build
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install ca-certificates and git (if needed for modules)
RUN apk add --no-cache ca-certificates git

# Cache Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Compile optimized static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/server

# Minimal production image
FROM alpine:latest

WORKDIR /app

# Add runtime certificates and timezone data
RUN apk add --no-cache ca-certificates tzdata

# Copy compiled binary from builder
COPY --from=builder /app/server .

# Ensure uploads directory structure exists
RUN mkdir -p uploads/left2serve

# Expose default backend port
EXPOSE 5000

# Start Go backend server
CMD ["./server"]
