{{- define "c4genaisuite.fullname" -}}
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

{{- define "c4genaisuite.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end -}}

{{- define "c4genaisuite.commonLabels" -}}
app.kubernetes.io/name: {{ include "c4genaisuite.name" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/part-of: {{ include "c4genaisuite.name" . }}
app.kubernetes.io/version: "{{ .Chart.AppVersion }}"
{{- end }}

{{- define "c4genaisuite.commonSelectors" -}}
app.kubernetes.io/name: {{ include "c4genaisuite.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Generate imagePullSecrets from global and component-specific values
Usage: {{ include "c4genaisuite.imagePullSecrets" (dict "global" .Values.global "component" .Values.frontend) }}
*/}}
{{- define "c4genaisuite.imagePullSecrets" -}}
{{- $imagePullSecrets := list }}
{{- if .global.imagePullSecrets }}
  {{- $imagePullSecrets = concat $imagePullSecrets .global.imagePullSecrets }}
{{- end }}
{{- if .component.image.pullSecrets }}
  {{- $imagePullSecrets = concat $imagePullSecrets .component.image.pullSecrets }}
{{- end }}
{{- if $imagePullSecrets -}}
imagePullSecrets:
  {{- range $imagePullSecrets }}
  - name: {{ . }}
  {{- end }}
{{- end -}}
{{- end }}