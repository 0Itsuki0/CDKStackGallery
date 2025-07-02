import { join } from 'path';
import { RustFunction } from 'cargo-lambda-cdk';
import { ApiKey, EndpointType, LambdaRestApi, UsagePlan } from 'aws-cdk-lib/aws-apigateway'
import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CachePolicy, Distribution, OriginRequestPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { RestApiOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';

export class HandlerStack extends Stack {
    private defaultTTL = 3600
    private maxTTL = 86400

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);
      
        // apigateway lambda (database handler)
        const apigatewayLambda = new RustFunction(this, 'DatabaseHandler', {
            manifestPath: join(__dirname, 'path_to_directory_with_cargo_toml/')
        });

  
        const restApi = new LambdaRestApi(this, 'RestAPI', {
            handler: apigatewayLambda,
            endpointTypes: [EndpointType.REGIONAL],
        });

        const cachePolicy = new CachePolicy(this, "CachePolicy", {
            cachePolicyName: "LicenseDistributionCachePolicy",
            maxTtl: Duration.seconds(this.maxTTL),
            defaultTtl: Duration.seconds(this.defaultTTL),
            enableAcceptEncodingBrotli: true,
            enableAcceptEncodingGzip: true
        })

        const distribution = new Distribution(this, "CloudFrontDistribution", {
            defaultBehavior: {
                origin: new RestApiOrigin(restApi, {}),
                originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                cachePolicy: cachePolicy
            },
        })

        distribution.applyRemovalPolicy(RemovalPolicy.DESTROY)


    }
}
