# Providers, remote state, and locals shared across the stack.
# One state file per environment, selected via Terraform workspaces.

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state in S3 with a DynamoDB lock table. Never apply prod locally.
  backend "s3" {
    bucket         = "demo-co-tfstate"
    key            = "platform/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "demo-co-tflock"
    encrypt        = true
  }
}

provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = {
      Owner       = "platform-team"
      Environment = terraform.workspace
      ManagedBy   = "terraform"
    }
  }
}

locals {
  env       = terraform.workspace          # "staging" | "production"
  name      = "demo-${local.env}"
  is_prod   = local.env == "production"
  # Bigger instances and multi-AZ in production.
  db_class  = local.is_prod ? "db.r6g.xlarge" : "db.t4g.medium"
  multi_az  = local.is_prod
}
