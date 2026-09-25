import { Construct } from "constructs";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";

export interface DatabaseProps {
  // VPC to place the database in
  vpc: ec2.IVpc;
  // Standby replica in a second AZ (roughly doubles the cost)
  multiAz: boolean;
}

export class Database extends Construct {
  // The RDS instance, used to open its security group to the app
  public readonly instance: rds.DatabaseInstance;
  // Name of the database created inside Postgres
  public readonly databaseName = "kubelearn";

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    this.instance = new rds.DatabaseInstance(this, "Postgres", {
      // PostgreSQL 16, matching docker-compose.yml for local development
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16_13 }),
      // Small Graviton instance; scale up via this line when traffic grows
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      // Put the database in the VPC...
      vpc: props.vpc,
      // ...in the isolated subnets, unreachable from the internet
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      // Generate the master password in Secrets Manager; exclude characters that would break a connection URL
      credentials: rds.Credentials.fromGeneratedSecret("kubelearn", {
        excludeCharacters: " %+~`#$&*()|[]{}:;<>?!'/@\"\\=,^",
      }),
      // Create the application database on first boot
      databaseName: this.databaseName,
      // Standby in another AZ when requested
      multiAz: props.multiAz,
      // Start with 20 GiB of storage...
      allocatedStorage: 20,
      // ...and let RDS grow it automatically up to 100 GiB
      maxAllocatedStorage: 100,
      // Encrypt data at rest with the default AWS-managed KMS key
      storageEncrypted: true,
      // Keep daily automated backups for a week
      backupRetention: Duration.days(7),
      // Apply minor engine patches automatically during the maintenance window
      autoMinorVersionUpgrade: true,
      // Ship Postgres logs to CloudWatch for troubleshooting
      cloudwatchLogsExports: ["postgresql"],
      // Block accidental "cdk destroy" of the production database
      deletionProtection: true,
      // If the stack is ever deleted, keep a final snapshot instead of losing data
      removalPolicy: RemovalPolicy.SNAPSHOT,
    });
  }
}
