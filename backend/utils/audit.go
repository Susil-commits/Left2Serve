package utils

import (
	"context"
	"log"

	"left2serve/backend/database"
)

type AuditOptions struct {
	ActorID    *int
	ActorRole  string
	Action     string
	TargetType string
	TargetID   *int
	Detail     string
	IP         string
}

func Audit(ctx context.Context, opt AuditOptions) {
	go func() {
		bgCtx := context.Background()
		_, err := database.Exec(bgCtx, `
			INSERT INTO audit_log (actor_id, actor_role, action, target_type, target_id, detail, ip) 
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			opt.ActorID,
			opt.ActorRole,
			opt.Action,
			opt.TargetType,
			opt.TargetID,
			opt.Detail,
			opt.IP,
		)
		if err != nil {
			log.Printf("Audit log error: %v\n", err)
		}
	}()
}
