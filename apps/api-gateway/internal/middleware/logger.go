package middleware

import (
	"net/http"
	"time"

	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"go.uber.org/zap"
)

// StructuredLogger returns middleware that logs each request with zap.
func StructuredLogger(logger *zap.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := chimiddleware.NewWrapResponseWriter(w, r.ProtoMajor)
			reqID := chimiddleware.GetReqID(r.Context())

			defer func() {
				logger.Info("request",
					zap.String("method", r.Method),
					zap.String("path", r.URL.Path),
					zap.Int("status", ww.Status()),
					zap.Int("bytes", ww.BytesWritten()),
					zap.Duration("latency", time.Since(start)),
					zap.String("request_id", reqID),
					zap.String("remote_addr", r.RemoteAddr),
				)
			}()

			next.ServeHTTP(ww, r)
		})
	}
}
