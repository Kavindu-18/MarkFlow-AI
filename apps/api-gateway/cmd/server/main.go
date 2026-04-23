package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"go.uber.org/zap"

	"github.com/markflow-ai/api-gateway/internal/config"
	"github.com/markflow-ai/api-gateway/internal/handlers"
	"github.com/markflow-ai/api-gateway/internal/middleware"
)

func main() {
	// Initialize structured logger
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("failed to load config", zap.Error(err))
	}

	r := chi.NewRouter()

	// Global middleware
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(middleware.StructuredLogger(logger))
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Correlation-ID"},
		ExposedHeaders:   []string{"X-Correlation-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check (no auth)
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// API v1 routes (protected)
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.AuthenticateJWT(cfg.B2CTenantName, cfg.B2CClientID, cfg.B2CPolicyName))

		// Exams
		r.Post("/exams", handlers.CreateExam(logger))
		r.Get("/exams/{examId}", handlers.GetExam(logger))
		r.Get("/exams", handlers.ListExams(logger))

		// Uploads
		r.Post("/uploads/presign", handlers.GeneratePresignedURL(logger, cfg))
		r.Post("/uploads/complete", handlers.CompleteUpload(logger, cfg))

		// Grading results
		r.Get("/submissions/{submissionId}", handlers.GetSubmission(logger))
		r.Get("/submissions/{submissionId}/results", handlers.GetGradingResults(logger))
		r.Post("/submissions/{submissionId}/results/{resultId}/override", handlers.OverrideGrade(logger))

		// Billing (webhook is separate, below)
		r.Get("/billing/usage", handlers.GetUsage(logger))
	})

	// Stripe webhook (uses Stripe signature verification, not JWT)
	r.Post("/api/v1/billing/webhooks/stripe", handlers.HandleStripeWebhook(logger, cfg))

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		logger.Info("server starting", zap.String("addr", addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("server failed", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down server")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}
