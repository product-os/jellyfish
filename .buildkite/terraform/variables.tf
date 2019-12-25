locals {
  deploy_id = substr(uuid(), 0, 4)
}

variable "key_name" {
  description = "SSH key pair name for logging into instances"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}

variable "ami_id" {
  description = "ID of AMI to use for instances"
  type        = string
  default     = "ami-06d51e91cea0dac8d"
}

variable "instance_count" {
  description = "Number of instances to deploy"
  type        = number
  default     = 1
}

variable "vpc_cidr_block" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_availability_zone" {
  description = "Subnet availability zone"
  type        = string
  default     = "us-west-2a"
}

variable "security_group_cidr_block" {
  description = "CIDR block used for security group ingress/egress rules"
  type        = string
  default     = "0.0.0.0/0"
}

variable "buildkite_agent_token" {
  description = "Buildkite agent token"
  type        = string
}

variable "buildkite_agent_key" {
  description = "Private SSH key for Buildkite agents"
  type        = string
}
