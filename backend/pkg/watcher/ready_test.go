package watcher

import (
	"testing"
)

func TestReady_FalseBeforeStart(t *testing.T) {
	t.Parallel()
	w, _, cancel := setupWatcher(t)
	defer cancel()
	if w.Ready() {
		t.Error("Ready() should be false before Start() completes")
	}
}
