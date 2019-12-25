output "vpc" {
  value = aws_vpc.vpc
}

output "subnet" {
  value = aws_subnet.subnet
}

output "security_group" {
  value = aws_security_group.security_group
}

output "route_table" {
  value = aws_route_table.table
}
