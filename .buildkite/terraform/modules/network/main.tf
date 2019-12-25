resource "aws_vpc" "vpc" {
  cidr_block           = var.vpc_cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    deploy_id = var.deploy_id
  }
}

resource "aws_subnet" "subnet" {
  vpc_id            = aws_vpc.vpc.id
  cidr_block        = cidrsubnet(aws_vpc.vpc.cidr_block, 3, 1)
  availability_zone = var.subnet_availability_zone
  tags = {
    deploy_id = var.deploy_id
  }
}

resource "aws_security_group" "security_group" {
  name   = "main"
  vpc_id = aws_vpc.vpc.id
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.security_group_cidr_block]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.security_group_cidr_block]
  }
  tags = {
    deploy_id = var.deploy_id
  }
}

resource "aws_internet_gateway" "gateway" {
  vpc_id = aws_vpc.vpc.id
  tags = {
    deploy_id = var.deploy_id
  }
}

resource "aws_route_table" "table" {
  vpc_id = aws_vpc.vpc.id
  route {
    cidr_block = var.security_group_cidr_block
    gateway_id = aws_internet_gateway.gateway.id
  }
  tags = {
    deploy_id = var.deploy_id
  }
}

resource "aws_route_table_association" "association" {
  subnet_id      = aws_subnet.subnet.id
  route_table_id = aws_route_table.table.id
}
