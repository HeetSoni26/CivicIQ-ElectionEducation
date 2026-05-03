# ─────────────────────────────────────────────────────────────────────────────
# CivicIQ — Terraform Configuration
# All GCP resources: Cloud Run, Firestore, Redis, VPC, Secret Manager,
# Cloud Armor, Firebase, BigQuery, Budget Alerts
# Provider: hashicorp/google ~> 5.0
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.20"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.20"
    }
  }

  backend "gcs" {
    bucket = "civiciq-terraform-state"
    prefix = "terraform/state"
  }
}

# ─── Variables ────────────────────────────────────────────────────────────────

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "region" {
  type        = string
  default     = "us-central1"
  description = "Default GCP region"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Environment: production | staging"
}

variable "billing_account" {
  type        = string
  description = "GCP Billing Account ID for budget alerts"
}

variable "alert_email" {
  type        = string
  description = "Email address for budget alerts"
}

# ─── Provider Configuration ───────────────────────────────────────────────────

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ─── Enable Required APIs ─────────────────────────────────────────────────────

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "firestore.googleapis.com",
    "redis.googleapis.com",
    "aiplatform.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "vpcaccess.googleapis.com",
    "compute.googleapis.com",
    "cloudarmor.googleapis.com",
    "bigquery.googleapis.com",
    "firebase.googleapis.com",
    "pubsub.googleapis.com",
    "translate.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudtrace.googleapis.com",
    "billingbudgets.googleapis.com",
  ])

  service            = each.value
  disable_on_destroy = false
}

# ─── VPC Network ──────────────────────────────────────────────────────────────

resource "google_compute_network" "civiciq_vpc" {
  name                    = "civiciq-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "civiciq_subnet" {
  name          = "civiciq-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.civiciq_vpc.id

  private_ip_google_access = true
}

# VPC Access Connector for Cloud Run → Redis (private IP)
resource "google_vpc_access_connector" "civiciq_connector" {
  name          = "civiciq-vpc-connector"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.civiciq_vpc.name
  min_instances = 2
  max_instances = 10
  machine_type  = "e2-micro"

  depends_on = [google_project_service.apis]
}

# ─── Firestore Database ───────────────────────────────────────────────────────

resource "google_firestore_database" "civiciq" {
  name        = "(default)"
  location_id = "nam5" # Multi-region US
  type        = "FIRESTORE_NATIVE"

  concurrency_mode            = "OPTIMISTIC"
  app_engine_integration_mode = "DISABLED"

  # Point-in-time recovery: 7-day backup window
  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_ENABLED"
  delete_protection_state            = "DELETE_PROTECTION_ENABLED"

  depends_on = [google_project_service.apis]
}

# Firestore daily backups
resource "google_firestore_backup_schedule" "daily" {
  database  = google_firestore_database.civiciq.name
  retention = "604800s" # 7 days

  daily_recurrence {}
}

# ─── Memorystore (Redis) ──────────────────────────────────────────────────────

resource "google_redis_instance" "civiciq_cache" {
  name           = "civiciq-redis"
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region

  authorized_network = google_compute_network.civiciq_vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_version = "REDIS_7_0"
  display_name  = "CivicIQ FAQ & Session Cache"

  # TLS in-transit encryption
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  # AUTH token (password)
  auth_enabled = true

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 2
        minutes = 0
      }
    }
  }

  depends_on = [google_project_service.apis, google_compute_network.civiciq_vpc]
}

# ─── Artifact Registry ────────────────────────────────────────────────────────

resource "google_artifact_registry_repository" "civiciq" {
  location      = var.region
  repository_id = "civiciq"
  description   = "CivicIQ Docker images"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  depends_on = [google_project_service.apis]
}

# ─── Service Accounts ─────────────────────────────────────────────────────────

resource "google_service_account" "cloud_run_sa" {
  account_id   = "civiciq-run-sa"
  display_name = "CivicIQ Cloud Run Service Account"
  description  = "Used by Cloud Run services to access GCP resources"
}

# Grant Cloud Run SA access to required services
resource "google_project_iam_member" "run_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "run_vertex" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "run_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "run_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "run_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "run_trace" {
  project = var.project_id
  role    = "roles/cloudtrace.agent"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# ─── Secret Manager ───────────────────────────────────────────────────────────

resource "google_secret_manager_secret" "vertex_ai_key" {
  secret_id = "vertex-ai-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "redis_password" {
  secret_id = "redis-password"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "firebase_admin_key" {
  secret_id = "firebase-admin-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

# ─── Cloud Run — AI Assistant Service ────────────────────────────────────────

resource "google_cloud_run_v2_service" "ai_assistant" {
  name     = "civiciq-ai-assistant"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = google_service_account.cloud_run_sa.email

    scaling {
      min_instance_count = 1
      max_instance_count = 100
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/civiciq/civiciq/ai-assistant-service:latest"

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
        cpu_idle          = false
        startup_cpu_boost = true
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "REDIS_HOST"
        value = google_redis_instance.civiciq_cache.host
      }

      env {
        name = "REDIS_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.redis_password.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "VERTEX_AI_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.vertex_ai_key.secret_id
            version = "latest"
          }
        }
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        initial_delay_seconds = 10
        period_seconds        = 5
        failure_threshold     = 3
        timeout_seconds       = 5
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        period_seconds    = 30
        failure_threshold = 3
        timeout_seconds   = 5
      }
    }

    max_instance_request_concurrency = 80

    timeout = "30s"

    vpc_access {
      connector = google_vpc_access_connector.civiciq_connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    annotations = {
      "autoscaling.knative.dev/minScale" = "1"
      "autoscaling.knative.dev/maxScale" = "100"
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.civiciq,
    google_vpc_access_connector.civiciq_connector,
  ]
}

# Allow unauthenticated access to Cloud Run (public API)
resource "google_cloud_run_service_iam_member" "public" {
  location = google_cloud_run_v2_service.ai_assistant.location
  service  = google_cloud_run_v2_service.ai_assistant.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ─── Cloud Pub/Sub Topics ─────────────────────────────────────────────────────

resource "google_pubsub_topic" "content_updated" {
  name = "election-content-updated"

  message_retention_duration = "86400s" # 1 day

  depends_on = [google_project_service.apis]
}

resource "google_pubsub_topic" "guide_completed" {
  name = "user-completed-guide"

  message_retention_duration = "86400s"

  depends_on = [google_project_service.apis]
}

resource "google_pubsub_topic" "ai_quality_alert" {
  name = "ai-quality-alert"

  message_retention_duration = "86400s"

  depends_on = [google_project_service.apis]
}

# ─── BigQuery Analytics ───────────────────────────────────────────────────────

resource "google_bigquery_dataset" "analytics" {
  dataset_id                 = "civiciq_analytics"
  friendly_name              = "CivicIQ Analytics"
  description                = "Privacy-preserving usage analytics — no PII, aggregated only"
  location                   = "US"
  delete_contents_on_destroy = false

  access {
    role          = "OWNER"
    user_by_email = google_service_account.cloud_run_sa.email
  }

  depends_on = [google_project_service.apis]
}

resource "google_bigquery_table" "events" {
  dataset_id          = google_bigquery_dataset.analytics.dataset_id
  table_id            = "events"
  deletion_protection = true

  time_partitioning {
    type  = "DAY"
    field = "event_date"
  }

  schema = jsonencode([
    { name = "event_date", type = "DATE", mode = "REQUIRED" },
    { name = "event", type = "STRING", mode = "REQUIRED" },
    { name = "country_code", type = "STRING", mode = "NULLABLE" },
    { name = "language", type = "STRING", mode = "REQUIRED" },
    { name = "session_id", type = "STRING", mode = "REQUIRED" },
    { name = "timestamp", type = "TIMESTAMP", mode = "REQUIRED" },
    { name = "properties", type = "JSON", mode = "NULLABLE" },
  ])
}

# ─── Cloud Armor Security Policy ─────────────────────────────────────────────

resource "google_compute_security_policy" "civiciq_armor" {
  name = "civiciq-security-policy"

  # OWASP ModSecurity Core Rule Set
  rule {
    action   = "deny(403)"
    priority = "1000"
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-stable')"
      }
    }
    description = "Block XSS attacks"
  }

  rule {
    action   = "deny(403)"
    priority = "1001"
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-stable')"
      }
    }
    description = "Block SQL injection"
  }

  # Rate limiting: 100 requests/minute per IP
  rule {
    action   = "throttle"
    priority = "2000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
    }
    description = "Rate limit: 100 req/min per IP"
  }

  # Block prompt injection patterns in request body
  rule {
    action   = "deny(403)"
    priority = "3000"
    match {
      expr {
        expression = "request.body.contains('ignore previous instructions') || request.body.contains('disregard system prompt') || request.body.contains('act as DAN')"
      }
    }
    description = "Block common prompt injection patterns"
  }

  # Default: allow
  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }

  depends_on = [google_project_service.apis]
}

# ─── Budget Alert ─────────────────────────────────────────────────────────────

resource "google_billing_budget" "civiciq" {
  billing_account = var.billing_account
  display_name    = "CivicIQ Monthly Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "20" # $20/month target
    }
  }

  threshold_rules {
    threshold_percent = 0.5  # Alert at $10
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.75 # Alert at $15
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.0  # Alert at $20
    spend_basis       = "CURRENT_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = [google_monitoring_notification_channel.email.id]
    disable_default_iam_recipients   = false
  }

  depends_on = [google_project_service.apis]
}

# ─── Monitoring Notification Channel ─────────────────────────────────────────

resource "google_monitoring_notification_channel" "email" {
  display_name = "CivicIQ Alert Email"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }

  depends_on = [google_project_service.apis]
}

# ─── Cloud Storage (knowledge base PDFs) ─────────────────────────────────────

resource "google_storage_bucket" "knowledge_base" {
  name          = "${var.project_id}-civiciq-knowledge-base"
  location      = "US"
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 5
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.apis]
}

# ─── Outputs ──────────────────────────────────────────────────────────────────

output "cloud_run_url" {
  value       = google_cloud_run_v2_service.ai_assistant.uri
  description = "Cloud Run AI Assistant service URL"
}

output "redis_host" {
  value       = google_redis_instance.civiciq_cache.host
  description = "Redis instance host (private IP)"
  sensitive   = true
}

output "firestore_name" {
  value       = google_firestore_database.civiciq.name
  description = "Firestore database name"
}

output "artifact_registry" {
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.civiciq.repository_id}"
  description = "Artifact Registry Docker repository URL"
}

output "vpc_connector" {
  value       = google_vpc_access_connector.civiciq_connector.id
  description = "VPC Serverless Access Connector ID"
}
