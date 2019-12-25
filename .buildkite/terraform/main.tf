provider "aws" {}

terraform {
  backend "s3" {
    bucket = "buildkite-terraform"
    key    = "jellyfish"
    region = "us-west-2"
  }
}

module "network" {
  source                    = "./modules/network"
  deploy_id                 = local.deploy_id
  vpc_cidr_block            = var.vpc_cidr_block
  subnet_availability_zone  = var.subnet_availability_zone
  security_group_cidr_block = var.security_group_cidr_block
}

module "instances" {
  source                = "./modules/instance"
  deploy_id             = local.deploy_id
  instance_type         = var.instance_type
  ami_id                = var.ami_id
  key_name              = var.key_name
  security_group_id     = module.network.security_group.id
  subnet_id             = module.network.subnet.id
  instance_count        = var.instance_count
  buildkite_agent_token = var.buildkite_agent_token
  buildkite_agent_key   = var.buildkite_agent_key
}
