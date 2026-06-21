# The VPC every environment runs in: public subnets for the load balancer,
# private subnets for the cluster and database.

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags                 = { Name = "${local.name}-vpc" }
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags              = { Name = "${local.name}-public-${count.index}" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "${local.name}-private-${count.index}" }
}

# Only the gateway's load balancer is reachable from the internet. Everything
# else (cluster nodes, RDS) lives in private subnets.
resource "aws_security_group" "db" {
  name        = "${local.name}-db"
  description = "Postgres — reachable only from the cluster"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.cluster.id]
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}
