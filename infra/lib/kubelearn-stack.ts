import { Construct } from "constructs";
import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { AppService } from "./constructs/app-service";
import { Cdn } from "./constructs/cdn";
import { Database } from "./constructs/database";
import { Network } from "./constructs/network";

export interface KubeLearnStackProps extends StackProps {
  // Run the database with a standby in a second AZ
  multiAzDatabase: boolean;
}

export class KubeLearnStack extends Stack {
  constructor(scope: Construct, id: string, props: KubeLearnStackProps) {
    super(scope, id, props);

    // VPC with public, private and isolated subnets
    const network = new Network(this, "Network");

    // RDS PostgreSQL in the isolated subnets
    const database = new Database(this, "Database", { vpc: network.vpc, multiAz: props.multiAzDatabase });

    // Shared secret between CloudFront and the load balancer
    const originVerifySecret = new secretsmanager.Secret(this, "OriginVerifySecret", {
      // 32 random alphanumeric characters (safe inside an HTTP header)
      generateSecretString: { passwordLength: 32, excludePunctuation: true },
    });

    // Fargate service + load balancer running the Next.js container
    const app = new AppService(this, "App", {
      vpc: network.vpc,
      database: database.instance,
      databaseName: database.databaseName,
      originVerifySecret,
    });

    // CloudFront in front of the load balancer
    const cdn = new Cdn(this, "Cdn", { loadBalancer: app.loadBalancer, originVerifySecret });

    // Public URL of the app
    const appUrl = `https://${cdn.distribution.distributionDomainName}`;

    // NextAuth builds callback URLs and secure cookies from this value
    app.container.addEnvironment("NEXTAUTH_URL", appUrl);

    // Print the URL after "cdk deploy"
    new CfnOutput(this, "AppUrl", { value: appUrl, description: "KubeLearn public URL" });
  }
}
