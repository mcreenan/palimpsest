# The single Postgres instance the platform shares (schema-per-service). See
# platform/docs/architecture.md for why one database, many schemas.

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "postgres" {
  identifier             = "rds-${local.env}"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = local.db_class
  allocated_storage      = local.is_prod ? 200 : 20
  multi_az               = local.multi_az
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  db_name                = "platform"
  username               = "platform"
  manage_master_user_password = true   # secret stored in Secrets Manager

  backup_retention_period = local.is_prod ? 30 : 7
  deletion_protection     = local.is_prod
  skip_final_snapshot     = !local.is_prod
}

output "db_endpoint" {
  value = aws_db_instance.postgres.endpoint
}
