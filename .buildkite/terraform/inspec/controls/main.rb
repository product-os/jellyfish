require 'json'

# Read Terraform output JSON.
file = inspec.profile.file('output.json')
output = JSON.parse(file)

# Set project-wide variables.
deploy_id = output['deploy_id']['value']

# Network Resources
vpc = output['network']['value']['vpc']
subnet = output['network']['value']['subnet']
security_group = output['network']['value']['security_group']
route_table = output['network']['value']['route_table']
control 'network' do
  title 'validate network resources'
  desc 'check that all required network resources exist as expected'
  tag 'network','vpc','subnet','security_group'
  describe aws_vpc(vpc_id: vpc['id']) do
    it {
      should exist
      should be_available
    }
    its('state') { should eq 'available' }
    its('cidr_block') { should cmp vpc['cidr_block'] }
    its('instance_tenancy') { should cmp vpc['instance_tenancy'] }
    its('dhcp_options_id') { should cmp vpc['dhcp_options_id'] }
    its('tags') { should include('deploy_id' => deploy_id) }
  end
  describe aws_subnet(subnet_id: subnet['id']) do
    it {
      should exist
      should be_available
    }
    its('tags') { should include('deploy_id' => deploy_id) }
  end
  describe aws_security_group(group_id: security_group['id']) do
    it { should exist }
    its('tags') { should include('deploy_id' => deploy_id) }
  end
  describe aws_route_table(route_table_id: route_table['id']) do
    it { should exist }
    its('vpc_id') { should cmp vpc['id'] }
    its('vpc_id') { should cmp route_table['vpc_id'] }
    its('tags') { should include('deploy_id' => deploy_id) }
    its('associations.count') { should eq 1 }
  end
end

# Instances
instances = output['instances']['value']['instance']
control 'instances' do
  title 'validate ec2 instances'
  desc 'checks that all required ec2 instances exist as expected'
  tag 'instance'
  instances.each do |instance|
    describe aws_ec2_instance(instance['id']) do
      it {
        should exist
        should be_running
      }
      its('image_id') { should cmp instance['ami'] }
      its('instance_type') { should cmp instance['instance_type'] }
      its('availability_zone') { should cmp instance['availability_zone'] }
      its('key_name') { should cmp instance['key_name'] }
      its('subnet_id') { should cmp instance['subnet_id'] }
      its('tags') { should include(key: 'deploy_id', value: deploy_id) }
    end     
  end
end
