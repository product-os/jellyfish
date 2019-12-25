variable "deploy_id" {
  description = "Deployment ID"
  type        = string
}

variable "ami_id" {
  description = "ID of AMI to use for instances"
  type        = string
}

variable "instance_type" {
  description = "EC2 Instance Type"
  type        = string
}

variable "instance_count" {
  description = "Number of instances to deploy"
  type        = number
}

variable "key_name" {
  description = "SSH Key pair name"
  type        = string
}

variable "subnet_id" {
  description = "ID of subnet to place instances in"
  type        = string
}

variable "security_group_id" {
  description = "ID of security group to associate instances with"
  type        = string
}

variable "buildkite_agent_token" {
  description = "Buildkite agent token"
  type        = string
}

variable "buildkite_agent_key" {
  description = "Private SSH key for Buildkite agents"
  type        = string
}
