resource "aws_instance" "instance" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [var.security_group_id]
  subnet_id              = var.subnet_id
  count                  = var.instance_count
  user_data              = <<-EOF
    #!/bin/bash
    sudo apt update && sudo apt-upgrade -y
    # Install Buildkite Agent
    echo "deb https://apt.buildkite.com/buildkite-agent stable main" | sudo tee /etc/apt/sources.list.d/buildkite-agent.list
    sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 32A37959C2FA5C3C99EFBC32A79206696452D198
    sudo apt-get update && sudo apt-get install -y buildkite-agent
    sudo sed -i "s/xxx/${var.buildkite_agent_token}/g" /etc/buildkite-agent/buildkite-agent.cfg
    sudo systemctl enable buildkite-agent && sudo systemctl start buildkite-agent
    # Install Docker
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo apt-key fingerprint 0EBFCD88
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    sudo systemctl enable docker && sudo systemctl start docker
    sudo usermod -aG docker buildkite-agent
    # Install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/download/1.25.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    # Copy private SSH key
    mkdir -p /var/lib/buildkite-agent/.ssh
    echo "${var.buildkite_agent_key}" > /var/lib/buildkite-agent/.ssh/id_rsa
    chown buildkite-agent:buildkite-agent /var/lib/buildkite-agent/.ssh
    chown buildkite-agent:buildkite-agent /var/lib/buildkite-agent/.ssh/id_rsa
    chmod 600 /var/lib/buildkite-agent/.ssh/id_rsa
    # Reboot system
    sudo reboot
    EOF
  tags = {
    deploy_id = var.deploy_id
  }
}

resource "aws_eip" "ip" {
  instance = aws_instance.instance.*.id[count.index]
  vpc      = true
  count    = var.instance_count
}
