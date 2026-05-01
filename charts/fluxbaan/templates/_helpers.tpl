{{/*
Expand the name of the chart.
*/}}
{{- define "fluxbaan.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by DNS naming spec).
If release name contains the chart name, use the release name only.
*/}}
{{- define "fluxbaan.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart label value: "name-version".
*/}}
{{- define "fluxbaan.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels applied to every resource.
*/}}
{{- define "fluxbaan.labels" -}}
helm.sh/chart: {{ include "fluxbaan.chart" . }}
{{ include "fluxbaan.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels shared by all workloads (no component here — added per-workload).
*/}}
{{- define "fluxbaan.selectorLabels" -}}
app.kubernetes.io/name: {{ include "fluxbaan.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend selector labels.
*/}}
{{- define "fluxbaan.backend.selectorLabels" -}}
{{ include "fluxbaan.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Frontend selector labels.
*/}}
{{- define "fluxbaan.frontend.selectorLabels" -}}
{{ include "fluxbaan.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
ServiceAccount name used by the backend.
*/}}
{{- define "fluxbaan.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "fluxbaan.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Backend image (repository:tag, falling back to AppVersion).
*/}}
{{- define "fluxbaan.backendImage" -}}
{{- $tag := .Values.backend.image.tag | default .Chart.AppVersion }}
{{- printf "%s:%s" .Values.backend.image.repository $tag }}
{{- end }}

{{/*
Frontend image (repository:tag, falling back to AppVersion).
*/}}
{{- define "fluxbaan.frontendImage" -}}
{{- $tag := .Values.frontend.image.tag | default .Chart.AppVersion }}
{{- printf "%s:%s" .Values.frontend.image.repository $tag }}
{{- end }}
