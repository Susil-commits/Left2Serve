package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"left2serve/backend/config"
	"left2serve/backend/controllers"
	"left2serve/backend/database"
	"left2serve/backend/jobs"
	"left2serve/backend/routes"
	"left2serve/backend/services"
	"left2serve/backend/sockets"
	"left2serve/backend/utils"
)

func main() {
	log.Println("Starting Left2Serve Go Backend...")

	// 1. Load Configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Fatal: Configuration error: %v\n", err)
	}

	if cfg.IsProduction {
		gin.SetMode(gin.ReleaseMode)
	}

	// 2. Connect to Database
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Fatal: Database connection failed: %v\n", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			log.Printf("Error closing database connection: %v\n", err)
		}
	}()

	// 3. Run Database Migrations and Schemas
	initCtx, cancelInit := context.WithTimeout(context.Background(), 30*time.Second)
	if err := database.Initialize(initCtx, db); err != nil {
		cancelInit()
		log.Fatalf("Fatal: Database initialization failed: %v\n", err)
	}
	cancelInit()

	// 4. Initialize Redis / In-Memory Cache
	utils.InitRedis(cfg)

	// 5. Sweep expired listings on startup
	sweepCtx, cancelSweep := context.WithTimeout(context.Background(), 10*time.Second)
	swept, err := database.SweepExpiredListings(sweepCtx)
	cancelSweep()
	if err != nil {
		log.Printf("Warning: Startup expired listings sweep failed: %v\n", err)
	} else if swept > 0 {
		log.Printf("Startup sweep: marked %d listing(s) as expired\n", swept)
	}

	// 6. Initialize Sockets
	sockets.InitSocketServer(cfg)

	// 7. Initialize Services
	services.InitEmailService(cfg)
	services.InitAuthService(cfg)
	services.InitReservationService(cfg)
	services.InitPaymentService(cfg)
	services.InitAIService(cfg)

	// 8. Initialize Controllers
	controllers.InitListingController(cfg)
	controllers.InitPaymentController(cfg)
	controllers.InitAdminController(cfg)

	// 9. Start Background Cron Jobs
	cronManager := jobs.SetupBackgroundJobs()
	defer cronManager.Stop()

	// 10. Setup HTTP Routes
	router := routes.SetupRouter(cfg)

	// 11. Start HTTP Server with Graceful Shutdown
	port := cfg.Port
	if port == "" {
		port = "5000"
	}
	addr := fmt.Sprintf(":%s", port)

	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("Left2Serve Go Server listening on port %s (production: %t)\n", port, cfg.IsProduction)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Fatal: Server listening failed: %v\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down Left2Serve server gracefully...")

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v\n", err)
	}

	log.Println("Left2Serve Go Server stopped.")
}
