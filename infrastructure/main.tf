# ── CivicIQ Terraform Infrastructure ─────────────────────────────────────────
# Complete GCP resource configuration

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "civiciq-terraform-state"
    prefix = "terraform/state"
  }
}

# ── Variables ─────────────────────────────────────────────────────────────────

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "project_number" {
  type        = string
  description = "GCP Project Number"
}

variable "budget_alert_email" {
  type        = string
  description = "Email for budget alerts"
}

# ── Provider ──────────────────────────────────────────────────────────────────

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ── Enable Required APIs ───────────────────────────────────────────────────────

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "firestore.googleapis.com",
    "firebase.googleapis.com",
    "aiplatform.googleapis.com",
    "redis.googleapis.com",
    "secretmanager.googleapis.com",
    "pubsub.googleapis.com",
    "bigquery.googleapis.com",
    "compute.googleapis.com",
    "servicenetworking.googleapis.com",
    "cloudarmor.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "translate.googleapis.com",
    "storage.googleapis.com",
  ])

  service            = each.key
  disable_on_destroy = false
}

# ── VPC Network ───────────────────────────────────────────────────────────────

resource "google_compute_network" "civiciq_vpc" {
  name                    = "civiciq-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "civiciq_subnet" {
  name          = "civiciq-subnet-${var.region}"
  ip_cidr_range = "10.0.0.0/24"
  network       = google_compute_network.civiciq_vpc.id
  region        = var.region

  private_ip_google_access = true
}

resource "google_compute_global_address" "private_ip_range" {
  name          = "civiciq-private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.civiciq_vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.civiciq_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# ── VPC Connector for Cloud Run → Redis ───────────────────────────────────────

resource "google_vpc_access_connector" "civiciq_connector" {
  name          = "civiciq-vpc-connector"
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.civiciq_vpc.name
  region        = var.region
  min_instances = 2
  max_instances = 10
}

# ── Firestore (Native Mode) ───────────────────────────────────────────────────

resource "google_firestore_database" "civiciq" {
  name        = "(default)"
  location_id = "nam5"  # Multi-region US
  type        = "FIRESTORE_NATIVE"

  concurrency_mode = "OPTIMISTIC"
  delete_protection_state = "DELETE_PROTECTION_ENABLED"

  depends_on = [google_project_service.apis["firestore.googleapis.com"]]
}

# Firestore backup schedule
resource "google_firestore_backup_schedule" "weekly" {
  database        = google_firestore_database.civiciq.name
  retention       = "8467200s"  # 98 days

  weekly_recurrence {
    day = "SUNDAY"
  }
}

# ── Cloud Storage ─────────────────────────────────────────────────────────────

resource "google_storage_bucket" "civic_documents" {
  name          = "${var.project_id}-civic-documents"
  location      = "US"
  force_destroy = false

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.civiciq_key.id
  }

  lifecycle_rule {
    action { type = "Delete" }
    condition { age = 2555 }  # 7 years retention
  }

  cors {
    origin          = ["https://civiciq.app"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

# ── Cloud KMS (CMEK) ──────────────────────────────────────────────────────────

resource "google_kms_key_ring" "civiciq_keyring" {
  name     = "civiciq-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "civiciq_key" {
  name            = "civiciq-encryption-key"
  key_ring        = google_kms_keyring.civiciq_keyring.id
  rotation_period = "7776000s"  # 90 days

  lifecycle {
    prevent_destroy = true
  }
}

# ── Memorystore for Redis ─────────────────────────────────────────────────────

resource "google_redis_instance" "civiciq_cache" {
  name           = "civiciq-cache"
  tier           = "STANDARD_HA"  # High availability
  memory_size_gb = 1
  region         = var.region

  authorized_network = google_compute_network.civiciq_vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_version = "REDIS_7_0"

  auth_enabled            = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }
  }

  depends_on = [google_service_networking_connection.private_vpc_connection]
}

# ── Secret Manager ────────────────────────────────────────────────────────────

locals {
  secrets = {
    "gemini-api-key"           = "placeholder_set_manually"
    "firebase-service-account" = "placeholder_set_manually"
    "redis-url"                = "rediss://:${google_redis_instance.civiciq_cache.auth_string}@${google_redis_instance.civiciq_cache.host}:${google_redis_instance.civiciq_cache.port}"
    "kms-key-id"               = google_kms_crypto_key.civiciq_key.id
  }
}

resource "google_secret_manager_secret" "civiciq_secrets" {
  for_each  = local.secrets
  secret_id = each.key

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "civiciq_secret_versions" {
  for_each    = local.secrets
  secret      = google_secret_manager_secret.civiciq_secrets[each.key].id
  secret_data = each.value
}

# ── Cloud Run Service ─────────────────────────────────────────────────────────

resource "google_cloud_run_v2_service" "civiciq_app" {
  name     = "civiciq-app"
  location = var.region

  template {
    scaling {
      min_instance_count = 1
      max_instance_count = 100
    }

    containers {
      image = "gcr.io/${var.project_id}/civiciq:latest"

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
        cpu_idle          = false
        startup_cpu_boost = true
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.civiciq_secrets["gemini-api-key"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "REDIS_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.civiciq_secrets["redis-url"].secret_id
            version = "latest"
          }
        }
      }

      ports {
        container_port = 8080
      }

      startup_probe {
        http_get {
          path = "/api/health"
        }
        initial_delay_seconds = 10
        period_seconds        = 5
        failure_threshold     = 10
      }

      liveness_probe {
        http_get {
          path = "/api/health"
        }
        period_seconds    = 30
        failure_threshold = 3
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.civiciq_connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    timeout = "30s"
    max_instance_request_concurrency = 80
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

# Allow public access
resource "google_cloud_run_v2_service_iam_member" "public" {
  location = google_cloud_run_v2_service.civiciq_app.location
  name     = google_cloud_run_v2_service.civiciq_app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ── Cloud Armor WAF ───────────────────────────────────────────────────────────

resource "google_compute_security_policy" "civiciq_waf" {
  name = "civiciq-waf"

  # Rate limiting: 100 requests per minute per IP
  rule {
    action   = "throttle"
    priority = 1000
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

  # OWASP ModSecurity Core Rule Set
  rule {
    action   = "deny(403)"
    priority = 2000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-stable')"
      }
    }
    description = "OWASP XSS protection"
  }

  rule {
    action   = "deny(403)"
    priority = 2001
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-stable')"
      }
    }
    description = "OWASP SQL injection protection"
  }

  # Block prompt injection patterns
  rule {
    action   = "deny(400)"
    priority = 3000
    match {
      expr {
        expression = "request.body.contains('ignore previous instructions') || request.body.contains('act as') || request.body.contains('DAN mode')"
      }
    }
    description = "Block prompt injection attempts"
  }

  # Default allow
  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow"
  }
}

# ── Cloud Pub/Sub Topics ──────────────────────────────────────────────────────

resource "google_pubsub_topic" "election_content_updated" {
  name = "election-content-updated"
  message_retention_duration = "86600s"  # 24 hours
}

resource "google_pubsub_topic" "user_completed_guide" {
  name = "user-completed-guide"
  message_retention_duration = "86600s"
}

resource "google_pubsub_topic" "ai_quality_alert" {
  name = "ai-quality-alert"
  message_retention_duration = "86600s"
}

# Cache invalidation subscription
resource "google_pubsub_subscription" "cache_invalidation" {
  name  = "cache-invalidation-sub"
  topic = google_pubsub_topic.election_content_updated.name

  ack_deadline_seconds = 20
  message_retention_duration = "1200s"
  retain_acked_messages = false

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.civiciq_app.uri}/api/internal/cache-invalidate"
  }
}

# ── BigQuery Analytics ────────────────────────────────────────────────────────

resource "google_bigquery_dataset" "civiciq_analytics" {
  dataset_id  = "civiciq_analytics"
  description = "Privacy-preserving usage analytics for CivicIQ"
  location    = "US"

  default_table_expiration_ms = 31536000000  # 1 year
  delete_contents_on_destroy  = false

  access {
    role          = "OWNER"
    special_group = "projectOwners"
  }

  access {
    role          = "READER"
    special_group = "projectViewers"
  }
}

resource "google_bigquery_table" "daily_events" {
  dataset_id = google_bigquery_dataset.civiciq_analytics.dataset_id
  table_id   = "daily_events"

  time_partitioning {
    type  = "DAY"
    field = "event_date"
  }

  clustering = ["country_code", "event_type", "language"]

  schema = jsonencode([
    { "name": "event_date",    "type": "DATE",    "mode": "REQUIRED" },
    { "name": "event_type",    "type": "STRING",  "mode": "REQUIRED" },
    { "name": "country_code",  "type": "STRING",  "mode": "NULLABLE" },
    { "name": "language",      "type": "STRING",  "mode": "NULLABLE" },
    { "name": "event_count",   "type": "INTEGER", "mode": "REQUIRED" },
    { "name": "unique_sessions","type": "INTEGER", "mode": "REQUIRED" },
  ])
}

# ── Budget Alert ($10/month) ──────────────────────────────────────────────────

resource "google_billing_budget" "civiciq_budget" {
  billing_account = var.billing_account_id
  display_name    = "CivicIQ Monthly Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "20"
    }
  }

  threshold_rules {
    threshold_percent = 0.5  # Alert at $10
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.75  # Alert at $15
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.0   # Alert at $20
    spend_basis       = "CURRENT_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.name
    ]
  }
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "Budget Alert Email"
  type         = "email"

  labels = {
    email_address = var.budget_alert_email
  }
}

# ── Outputs ───────────────────────────────────────────────────────────────────

output "cloud_run_url" {
  value       = google_cloud_run_v2_service.civiciq_app.uri
  description = "CivicIQ Cloud Run service URL"
}

output "redis_host" {
  value       = google_redis_instance.civiciq_cache.host
  description = "Redis instance host (private)"
  sensitive   = true
}

output "firestore_database" {
  value       = google_firestore_database.civiciq.name
  description = "Firestore database name"
}
