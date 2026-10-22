package utils

import (
	"testing"
	"time"
)

func TestCacheSetGet(t *testing.T) {
	key := "test_key_123"
	val := `{"msg": "cached data"}`

	CacheSet(key, val, 1*time.Second)

	retrieved, ok := CacheGet(key)
	if !ok {
		t.Fatalf("Expected cache hit for %s", key)
	}
	if retrieved != val {
		t.Errorf("Cache value mismatch: got %q, expected %q", retrieved, val)
	}

	InvalidateCachePrefix("test_key")

	_, ok = CacheGet(key)
	if ok {
		t.Errorf("Expected cache miss after InvalidateCachePrefix")
	}
}
