package services

import (
	"testing"
)

func TestBadgeTiersConfiguration(t *testing.T) {
	if len(BadgeTiers) == 0 {
		t.Fatal("BadgeTiers list should not be empty")
	}

	prevThreshold := 0
	for _, tier := range BadgeTiers {
		if tier.Threshold <= prevThreshold {
			t.Errorf("Badge tier %s threshold %d is not strictly greater than previous %d", tier.ID, tier.Threshold, prevThreshold)
		}
		if tier.Name == "" || tier.Icon == "" || tier.ID == "" {
			t.Errorf("Badge tier %+v has missing required fields", tier)
		}
		prevThreshold = tier.Threshold
	}

	// Verify expected standard tiers exist
	tierMap := make(map[string]int)
	for _, tier := range BadgeTiers {
		tierMap[tier.ID] = tier.Threshold
	}

	expected := map[string]int{
		"bronze":   10,
		"silver":   50,
		"gold":     100,
		"platinum": 500,
		"eco_hero": 1000,
	}

	for id, expectedThresh := range expected {
		thresh, exists := tierMap[id]
		if !exists {
			t.Errorf("Expected tier %q not found in BadgeTiers", id)
		} else if thresh != expectedThresh {
			t.Errorf("Tier %q threshold = %d, expected %d", id, thresh, expectedThresh)
		}
	}
}
