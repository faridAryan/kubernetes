import { App, Tags } from "aws-cdk-lib";
import { KubeLearnStack } from "../lib/kubelearn-stack";

// CDK application entry point (see cdk.json)
const app = new App();

new KubeLearnStack(app, "KubeLearnStack", {
  // Deploy to the account/region of the credentials running "cdk deploy"
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
  // Enable with: npx cdk deploy -c multiAz=true
  multiAzDatabase: app.node.tryGetContext("multiAz") === "true",
});

// Tag every resource so costs can be grouped by project
Tags.of(app).add("project", "kubelearn");
