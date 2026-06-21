# The Kubernetes cluster the platform services run on. Manifests under
# `kubernetes/` are applied to this cluster by the deploy pipeline.

resource "aws_eks_cluster" "main" {
  name     = "eks-${local.env}"
  role_arn = aws_iam_role.cluster.arn
  version  = "1.29"

  vpc_config {
    subnet_ids = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
  }
}

resource "aws_eks_node_group" "default" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "default"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = aws_subnet.private[*].id
  instance_types  = [local.is_prod ? "m6i.large" : "t3.large"]

  scaling_config {
    desired_size = local.is_prod ? 4 : 2
    min_size     = 2
    max_size     = local.is_prod ? 10 : 4
  }
}

resource "aws_security_group" "cluster" {
  name        = "${local.name}-cluster"
  description = "EKS worker nodes"
  vpc_id      = aws_vpc.main.id
}

output "cluster_name" {
  value = aws_eks_cluster.main.name
}
