.PHONY: lint
lint:
	make init
	terraform validate

.PHONY: init
init:
	echo $(S3_BUCKET)
	make clean
	terraform init

.PHONY: clean
clean:
	rm -fr .terraform
	rm -f *.tfplan
	rm -f terraform.tfstate*

.PHONY: deploy
deploy:
	terraform plan -out=terraform.tfplan
	terraform apply terraform.tfplan

.PHONY: destroy
destroy:
	terraform destroy -auto-approve

.PHONY: show
show:
	terraform show

.PHONY: inspec
inspec:
	terraform output -json > inspec/files/output.json
	inspec exec inspec -t aws://
	rm -f inspec/files/output.json
