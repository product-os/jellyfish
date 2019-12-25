variable "deploy_id" {
  description = "Deployment ID"
  type        = string
}

variable "vpc_cidr_block" {
  description = "VPC CIDR block"
  type        = string
}

variable "subnet_availability_zone" {
  description = "Subnet availability zone"
  type        = string
}

variable "security_group_cidr_block" {
  description = "CIDR block used for security group ingress/egress rules"
  type        = string
}
