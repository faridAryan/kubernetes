import { Construct } from "constructs";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { ORIGIN_VERIFY_HEADER } from "./app-service";

export interface CdnProps {
  // Load balancer CloudFront forwards requests to
  loadBalancer: elbv2.ApplicationLoadBalancer;
  // Secret sent in the origin-verify header
  originVerifySecret: secretsmanager.ISecret;
}

export class Cdn extends Construct {
  // The CloudFront distribution; its domain is the public URL of the app
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: CdnProps) {
    super(scope, id);

    // How CloudFront reaches the load balancer
    const origin = new origins.LoadBalancerV2Origin(props.loadBalancer, {
      // The listener is plain HTTP (add a custom domain + ACM certificate to switch to HTTPS)
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      // Prove to the load balancer that the request came through CloudFront
      customHeaders: { [ORIGIN_VERIFY_HEADER]: props.originVerifySecret.secretValue.unsafeUnwrap() },
    });

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      // Pages and API calls: never cached, everything forwarded
      defaultBehavior: {
        // Send to the load balancer
        origin,
        // Upgrade plain HTTP visitors to HTTPS
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // POST/PUT/DELETE are needed for the API routes
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        // Dynamic, per-user responses must not be cached
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        // Forward cookies, query strings and headers, plus CloudFront-Viewer-Address for rate limiting
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_AND_CLOUDFRONT_2022,
      },
      additionalBehaviors: {
        // Hashed, immutable Next.js build assets: cache them at the edge
        "/_next/static/*": {
          // Same load balancer origin
          origin,
          // HTTPS only for visitors
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          // Long-lived edge caching with compression
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      // Use only North America and Europe edge locations (cheapest); change to PRICE_CLASS_ALL for global users
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      // Serve over HTTP/2 and HTTP/3
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });
  }
}
