import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export class Network extends Construct {
  // The VPC shared by the load balancer, containers and database
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, "Vpc", {
      // Two Availability Zones: enough for ALB and RDS subnet group requirements
      maxAzs: 2,
      // One NAT gateway keeps cost down; use 2 for AZ-level redundancy in production
      natGateways: 1,
      subnetConfiguration: [
        // Public subnets: only the internet-facing load balancer and the NAT gateway live here
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        // Private subnets with outbound internet (via NAT): ECS tasks pull images and call AWS APIs from here
        { name: "app", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
        // Isolated subnets: no internet route at all, used only by the database
        { name: "data", subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });
  }
}
