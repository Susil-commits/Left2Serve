package routes

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"left2serve/backend/config"
	"left2serve/backend/controllers"
	"left2serve/backend/middleware"
	"left2serve/backend/sockets"
	"left2serve/backend/utils"
)

func SetupRouter(cfg *config.Config) *gin.Engine {
	r := gin.New()

	// Default Gin logger and recovery
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// Security & CORS middlewares
	r.Use(middleware.CORSMiddleware(cfg))
	r.Use(middleware.RequestIDMiddleware())
	r.Use(middleware.SecurityHeadersMiddleware())

	// Static files for uploads
	r.Static("/uploads", "./uploads")

	// Root API Info & Health checks
	r.GET("/", controllers.GlobalHealthController.Root)
	r.GET("/api/health", controllers.GlobalHealthController.Health)
	r.GET("/api/health/notifications", controllers.GlobalHealthController.NotificationsHealth)

	// tRPC Compatibility
	r.Any("/trpc/*any", controllers.GlobalHealthController.TRPCCompat)

	// Socket.IO v4 handler (WebSocket & Polling fallback)
	if sockets.GlobalSocketServer != nil {
		r.Any("/socket.io/*any", sockets.GlobalSocketServer.HandleSocketIO)
		r.Any("/socket.io", sockets.GlobalSocketServer.HandleSocketIO)
	}

	// Rate limiters
	apiLimiter := middleware.NewRateLimiter(300, 15*time.Minute)
	authLimiter := middleware.NewRateLimiter(20, 15*time.Minute)
	aiLimiter := middleware.NewRateLimiter(10, 1*time.Minute)

	api := r.Group("/api")
	api.Use(apiLimiter.Middleware("Too many requests, please try again later"))

	// --- Auth Routes ---
	auth := api.Group("/auth")
	{
		auth.POST("/register", authLimiter.Middleware("Too many attempts, please try again later"), controllers.GlobalAuthController.Register)
		auth.POST("/login", authLimiter.Middleware("Too many attempts, please try again later"), controllers.GlobalAuthController.Login)
		auth.GET("/me", middleware.AuthMiddleware(cfg), controllers.GlobalAuthController.GetMe)
		auth.GET("/impact", middleware.AuthMiddleware(cfg), controllers.GlobalAuthController.GetImpact)
		auth.PUT("/profile", middleware.AuthMiddleware(cfg), controllers.GlobalAuthController.UpdateProfile)
		auth.PUT("/password", middleware.AuthMiddleware(cfg), controllers.GlobalAuthController.UpdatePassword)
		auth.POST("/forgot-password", controllers.GlobalAuthController.ForgotPassword)
		auth.POST("/reset-password", controllers.GlobalAuthController.ResetPassword)
		auth.GET("/2fa/setup", middleware.AuthMiddleware(cfg), controllers.GlobalAuthController.Setup2FA)
		auth.POST("/2fa/verify", middleware.AuthMiddleware(cfg), controllers.GlobalAuthController.Verify2FA)
		auth.POST("/2fa/disable", middleware.AuthMiddleware(cfg), controllers.GlobalAuthController.Disable2FA)
	}

	// --- Listings Routes ---
	listings := api.Group("/listings")
	{
		listings.POST("/upload", middleware.AuthMiddleware(cfg), controllers.GlobalListingController.Upload)
		listings.POST("/analyze-image", middleware.AuthMiddleware(cfg), middleware.RequireRole("donor"), controllers.GlobalListingController.AnalyzeImage)
		listings.GET("", utils.CacheMiddleware(60), controllers.GlobalListingController.GetAll)
		listings.GET("/analytics/me", middleware.AuthMiddleware(cfg), middleware.RequireRole("donor"), controllers.GlobalListingController.GetAnalyticsMe)
		listings.GET("/mine", middleware.AuthMiddleware(cfg), controllers.GlobalListingController.GetMine)
		listings.GET("/templates", middleware.AuthMiddleware(cfg), controllers.GlobalListingController.GetTemplates)
		listings.GET("/stats", utils.CacheMiddleware(300), controllers.GlobalListingController.GetStats)
		listings.GET("/impact", utils.CacheMiddleware(300), controllers.GlobalListingController.GetImpact)
		listings.GET("/:id", middleware.OptionalAuthMiddleware(cfg), controllers.GlobalListingController.GetOne)
		listings.POST("", middleware.AuthMiddleware(cfg), middleware.RequireRole("donor"), controllers.GlobalListingController.Create)
		listings.PUT("/:id", middleware.AuthMiddleware(cfg), controllers.GlobalListingController.Update)
		listings.DELETE("/:id", middleware.AuthMiddleware(cfg), controllers.GlobalListingController.Delete)
		listings.POST("/:id/close", middleware.AuthMiddleware(cfg), controllers.GlobalListingController.Close)
	}

	// --- Reservations Routes ---
	reservations := api.Group("/reservations")
	{
		reservations.POST("", middleware.AuthMiddleware(cfg), middleware.RequireRole("ngo", "volunteer"), controllers.GlobalReservationController.Create)
		reservations.GET("", middleware.AuthMiddleware(cfg), controllers.GlobalReservationController.GetMine)
		reservations.GET("/listing/:listingId", middleware.AuthMiddleware(cfg), controllers.GlobalReservationController.GetForListing)
		reservations.GET("/:id/qr-token", middleware.AuthMiddleware(cfg), controllers.GlobalReservationController.GenerateQRToken)
		reservations.POST("/verify-qr", middleware.AuthMiddleware(cfg), controllers.GlobalReservationController.VerifyQRToken)
		reservations.PATCH("/:id", middleware.AuthMiddleware(cfg), controllers.GlobalReservationController.UpdateStatus)
	}

	// --- Payments Routes ---
	payments := api.Group("/payments")
	{
		payments.POST("/config", controllers.GlobalPaymentController.GetConfig)
		payments.GET("/config", controllers.GlobalPaymentController.GetConfig)
		payments.POST("/create-order", middleware.AuthMiddleware(cfg), middleware.RequireRole("ngo", "volunteer"), controllers.GlobalPaymentController.CreateOrder)
		payments.POST("/verify", middleware.AuthMiddleware(cfg), middleware.RequireRole("ngo", "volunteer"), controllers.GlobalPaymentController.VerifyPayment)
	}

	// --- Admin Routes ---
	admin := api.Group("/admin")
	{
		admin.POST("/login", authLimiter.Middleware("Too many attempts, please try again later"), controllers.GlobalAdminController.Login)
		admin.GET("/stats", middleware.AuthMiddleware(cfg), middleware.RequireRole("admin"), utils.CacheMiddleware(60), controllers.GlobalAdminController.GetStats)
		admin.GET("/users", middleware.AuthMiddleware(cfg), middleware.RequireRole("admin"), controllers.GlobalAdminController.GetUsers)
		admin.GET("/ngos", middleware.AuthMiddleware(cfg), middleware.RequireRole("admin"), controllers.GlobalAdminController.GetNgos)
		admin.GET("/orders", middleware.AuthMiddleware(cfg), middleware.RequireRole("admin"), controllers.GlobalAdminController.GetOrders)
		admin.GET("/listings", middleware.AuthMiddleware(cfg), middleware.RequireRole("admin"), controllers.GlobalAdminController.GetListings)
		admin.DELETE("/listings/:id", middleware.AuthMiddleware(cfg), middleware.RequireRole("admin"), controllers.GlobalAdminController.DeleteListing)
		admin.PATCH("/orders/:id", middleware.AuthMiddleware(cfg), middleware.RequireRole("admin"), controllers.GlobalAdminController.UpdateOrder)
		admin.PATCH("/users/:id", middleware.AuthMiddleware(cfg), middleware.RequireRole("admin"), controllers.GlobalAdminController.UpdateUser)
		admin.DELETE("/users/:id", middleware.AuthMiddleware(cfg), middleware.RequireRole("admin"), controllers.GlobalAdminController.DeleteUser)
		admin.PATCH("/users/:id/password", middleware.AuthMiddleware(cfg), middleware.RequireRole("admin"), controllers.GlobalAdminController.ResetUserPassword)
		admin.GET("/trends", middleware.AuthMiddleware(cfg), middleware.RequireRole("admin"), controllers.GlobalAdminController.GetTrends)
		admin.GET("/audit-log", middleware.AuthMiddleware(cfg), middleware.RequireRole("admin"), controllers.GlobalAdminController.GetAuditLog)
		admin.GET("/export", middleware.AuthMiddleware(cfg), middleware.RequireRole("admin"), controllers.GlobalAdminController.ExportData)
	}

	// --- Notifications Routes ---
	notifications := api.Group("/notifications")
	{
		notifications.GET("", middleware.AuthMiddleware(cfg), controllers.GlobalNotificationController.GetNotifications)
		notifications.GET("/unread-count", middleware.AuthMiddleware(cfg), controllers.GlobalNotificationController.GetUnreadCount)
		notifications.PATCH("/read-all", middleware.AuthMiddleware(cfg), controllers.GlobalNotificationController.MarkAllAsRead)
		notifications.PATCH("/:id/read", middleware.AuthMiddleware(cfg), controllers.GlobalNotificationController.MarkAsRead)
		notifications.DELETE("/:id", middleware.AuthMiddleware(cfg), controllers.GlobalNotificationController.DeleteNotification)
	}

	// --- Reviews Routes ---
	reviews := api.Group("/reviews")
	{
		reviews.POST("", middleware.AuthMiddleware(cfg), controllers.GlobalReviewController.CreateReview)
		reviews.GET("/reservation/:id", middleware.AuthMiddleware(cfg), controllers.GlobalReviewController.GetReservationReview)
		reviews.GET("/user/:userId", middleware.OptionalAuthMiddleware(cfg), controllers.GlobalReviewController.GetUserReviews)
	}

	// --- Chat Routes ---
	chat := api.Group("/chat")
	{
		chat.GET("/:reservationId", middleware.AuthMiddleware(cfg), controllers.GlobalChatController.GetMessages)
	}

	// --- Watchlists Routes ---
	watchlists := api.Group("/watchlists")
	{
		watchlists.GET("", middleware.AuthMiddleware(cfg), middleware.RequireRole("ngo", "volunteer"), controllers.GlobalWatchlistController.GetUserWatchlists)
		watchlists.POST("", middleware.AuthMiddleware(cfg), middleware.RequireRole("ngo", "volunteer"), controllers.GlobalWatchlistController.CreateWatchlist)
		watchlists.DELETE("/:id", middleware.AuthMiddleware(cfg), middleware.RequireRole("ngo", "volunteer"), controllers.GlobalWatchlistController.DeleteWatchlist)
	}

	// --- Forum Routes ---
	forum := api.Group("/forum")
	{
		forum.GET("/categories", middleware.AuthMiddleware(cfg), utils.CacheMiddleware(300), controllers.GlobalForumController.GetCategories)
		forum.GET("/categories/:id/posts", middleware.AuthMiddleware(cfg), utils.CacheMiddleware(60), controllers.GlobalForumController.GetPostsInCategory)
		forum.POST("/categories/:id/posts", middleware.AuthMiddleware(cfg), controllers.GlobalForumController.CreatePost)
		forum.GET("/posts/:id", middleware.AuthMiddleware(cfg), controllers.GlobalForumController.GetPostDetails)
		forum.POST("/posts/:id/replies", middleware.AuthMiddleware(cfg), controllers.GlobalForumController.CreateReply)
		forum.PUT("/replies/:id", middleware.AuthMiddleware(cfg), controllers.GlobalForumController.UpdateReply)
		forum.DELETE("/replies/:id", middleware.AuthMiddleware(cfg), controllers.GlobalForumController.DeleteReply)
		forum.PUT("/posts/:id", middleware.AuthMiddleware(cfg), controllers.GlobalForumController.UpdatePost)
		forum.DELETE("/posts/:id", middleware.AuthMiddleware(cfg), controllers.GlobalForumController.DeletePost)
	}

	// --- AI Routes ---
	ai := api.Group("/ai")
	{
		ai.POST("/describe", aiLimiter.Middleware("Too many AI requests, please slow down"), middleware.AuthMiddleware(cfg), middleware.RequireRole("donor"), controllers.GlobalAIController.Describe)
		ai.POST("/chat", aiLimiter.Middleware("Too many AI requests, please slow down"), controllers.GlobalAIController.Chat)
	}

	// 404 Handler
	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
	})

	return r
}
