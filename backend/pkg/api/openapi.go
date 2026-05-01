package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const openAPISpec = `{
  "openapi": "3.1.0",
  "info": {
    "title": "Fluxbaan API",
    "version": "0.2.0",
    "description": "Backend API for Fluxbaan — a Flux CD visualisation dashboard."
  },
  "paths": {
    "/healthz": {
      "get": {
        "summary": "Liveness probe",
        "operationId": "getHealthz",
        "tags": ["health"],
        "responses": {
          "200": {
            "description": "Service is alive",
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/StatusOK"}}}
          }
        }
      }
    },
    "/readyz": {
      "get": {
        "summary": "Readiness probe",
        "operationId": "getReadyz",
        "tags": ["health"],
        "responses": {
          "200": {
            "description": "Service is ready",
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/StatusReady"}}}
          },
          "503": {
            "description": "Informers not yet synced",
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/StatusNotReady"}}}
          }
        }
      }
    },
    "/metrics": {
      "get": {
        "summary": "Prometheus metrics",
        "operationId": "getMetrics",
        "tags": ["observability"],
        "responses": {
          "200": {"description": "Prometheus text format metrics"}
        }
      }
    },
    "/api/tree": {
      "get": {
        "summary": "Return the current Flux resource graph",
        "operationId": "getTree",
        "tags": ["graph"],
        "responses": {
          "200": {
            "description": "Current graph snapshot",
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Graph"}}}
          }
        }
      }
    },
    "/api/events": {
      "get": {
        "summary": "SSE stream of graph updates",
        "operationId": "streamEvents",
        "tags": ["graph"],
        "responses": {
          "200": {
            "description": "Server-Sent Events stream; each event is a serialised Graph",
            "content": {"text/event-stream": {"schema": {"type": "string"}}}
          }
        }
      }
    },
    "/api/info": {
      "get": {
        "summary": "Cluster metadata",
        "operationId": "getInfo",
        "tags": ["cluster"],
        "responses": {
          "200": {
            "description": "Cluster metadata",
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ClusterInfo"}}}
          }
        }
      }
    },
    "/api/reconcile/{kind}/{namespace}/{name}": {
      "post": {
        "summary": "Trigger reconciliation of a Flux resource",
        "operationId": "reconcileResource",
        "tags": ["actions"],
        "parameters": [
          {"name": "kind", "in": "path", "required": true, "schema": {"type": "string"}},
          {"name": "namespace", "in": "path", "required": true, "schema": {"type": "string"}},
          {"name": "name", "in": "path", "required": true, "schema": {"type": "string"}}
        ],
        "responses": {
          "204": {"description": "Reconciliation annotation applied"},
          "400": {"description": "Unsupported kind", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}},
          "404": {"description": "Resource not found", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}},
          "500": {"description": "Patch failed", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}}
        }
      }
    },
    "/api/suspend/{kind}/{namespace}/{name}": {
      "post": {
        "summary": "Suspend a Flux resource",
        "operationId": "suspendResource",
        "tags": ["actions"],
        "parameters": [
          {"name": "kind", "in": "path", "required": true, "schema": {"type": "string"}},
          {"name": "namespace", "in": "path", "required": true, "schema": {"type": "string"}},
          {"name": "name", "in": "path", "required": true, "schema": {"type": "string"}}
        ],
        "responses": {
          "204": {"description": "Resource suspended"},
          "400": {"description": "Unsupported kind", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}},
          "404": {"description": "Resource not found", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}},
          "500": {"description": "Patch failed", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}}
        }
      }
    },
    "/api/resume/{kind}/{namespace}/{name}": {
      "post": {
        "summary": "Resume a suspended Flux resource",
        "operationId": "resumeResource",
        "tags": ["actions"],
        "parameters": [
          {"name": "kind", "in": "path", "required": true, "schema": {"type": "string"}},
          {"name": "namespace", "in": "path", "required": true, "schema": {"type": "string"}},
          {"name": "name", "in": "path", "required": true, "schema": {"type": "string"}}
        ],
        "responses": {
          "204": {"description": "Resource resumed"},
          "400": {"description": "Unsupported kind", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}},
          "404": {"description": "Resource not found", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}},
          "500": {"description": "Patch failed", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}}
        }
      }
    }
  },
  "components": {
    "schemas": {
      "StatusOK": {"type": "object", "properties": {"status": {"type": "string", "example": "ok"}}},
      "StatusReady": {"type": "object", "properties": {"status": {"type": "string", "example": "ready"}}},
      "StatusNotReady": {
        "type": "object",
        "properties": {
          "status": {"type": "string", "example": "not_ready"},
          "reason": {"type": "string", "example": "informers syncing"}
        }
      },
      "ErrorResponse": {
        "type": "object",
        "properties": {
          "error": {"type": "string"},
          "request_id": {"type": "string"}
        }
      },
      "Node": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "type": {"type": "string", "enum": ["Source","Kustomization","HelmRelease","ImageAutomation","Notification"]},
          "name": {"type": "string"},
          "namespace": {"type": "string"},
          "kind": {"type": "string"},
          "status": {"type": "string", "enum": ["Healthy","Unhealthy","Progressing","Unknown"]},
          "message": {"type": "string"},
          "sourceRef": {"type": "string"},
          "revision": {"type": "string"},
          "inventory": {"type": "array", "items": {"type": "string"}}
        }
      },
      "Edge": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "source": {"type": "string"},
          "target": {"type": "string"}
        }
      },
      "Graph": {
        "type": "object",
        "properties": {
          "nodes": {"type": "array", "items": {"$ref": "#/components/schemas/Node"}},
          "edges": {"type": "array", "items": {"$ref": "#/components/schemas/Edge"}}
        }
      },
      "ClusterInfo": {
        "type": "object",
        "properties": {
          "clusterName": {"type": "string"},
          "k8sVersion": {"type": "string"},
          "fluxVersion": {"type": "string"},
          "talosVersion": {"type": "string"},
          "ciliumVersion": {"type": "string"},
          "ingressController": {"type": "string"}
        }
      }
    }
  }
}`

// GetOpenAPI serves the static OpenAPI 3.1 spec.
func (h *Handler) GetOpenAPI(c *gin.Context) {
	c.Header("Content-Type", "application/json")
	c.String(http.StatusOK, openAPISpec)
}
