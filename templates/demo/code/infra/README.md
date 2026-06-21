# infra

Core infrastructure for Demo Co: the cloud account layout, the Kubernetes
cluster the `platform` services run on, the database they share, and the CI/CD
pipeline that ships everything. If it provisions, deploys, or pages someone,
it's defined here.

This repo is authoritative for **how the system is run** — environments,
networking, secrets, deploys, and on-call. Application behavior lives in
`platform` and `web`.

## Layout

```
infra/
  terraform/             # cloud resources (AWS), per-environment
    main.tf              # providers, remote state, shared locals
    network.tf          # VPC, subnets, security groups
    eks.tf               # the Kubernetes cluster
    rds.tf               # the shared Postgres instance
  kubernetes/            # service manifests applied to the cluster
    gateway.yaml         # public Deployment + Service + Ingress
    accounts.yaml        # internal Deployment + Service
    billing.yaml         # internal Deployment + Service
  .github/workflows/
    deploy.yml           # build → test → deploy pipeline
  runbooks/
    deploys.md           # how a deploy works and how to roll back
    incident-response.md # severity levels, on-call, comms
```

## Environments

| Environment | Cluster        | Database              | Deployed from        |
|-------------|----------------|-----------------------|----------------------|
| staging     | `eks-staging`  | `rds-staging`         | every merge to `main`|
| production  | `eks-prod`     | `rds-prod`            | a tagged release     |

State is stored remotely (S3 + DynamoDB lock). Never run `terraform apply` from a
laptop against production — that goes through the pipeline. See
`runbooks/deploys.md`.

## Common tasks

```sh
cd terraform
terraform workspace select staging
terraform plan         # review before any change
# production applies happen in CI, not here
```
