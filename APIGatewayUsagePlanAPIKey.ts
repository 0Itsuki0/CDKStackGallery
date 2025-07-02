import { join } from 'path';
import { RustFunction } from 'cargo-lambda-cdk';
import { ApiKey, EndpointType, LambdaRestApi, UsagePlan } from 'aws-cdk-lib/aws-apigateway'
import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

export class HandlerStack extends Stack {

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        // apigateway lambda (database handler)
        const apigatewayLambda = new RustFunction(this, 'DatabaseHandler', {
            manifestPath: join(__dirname, 'path_to_directory_with_cargo_toml/')
        });

        const restApi = new LambdaRestApi(this, 'RestAPI', {
            handler: apigatewayLambda,
            endpointTypes: [EndpointType.REGIONAL],
            defaultMethodOptions: {
                apiKeyRequired: true
            }
        });

        const apiKey = new ApiKey(this, "APIKey", {
            apiKeyName: "LicenseAPIKey"
        })

        const usagePlan = new UsagePlan(this, "UsagePlan", {
            name: "LicenseAPIUsagePlan"
        })

        usagePlan.addApiKey(apiKey, {})
        usagePlan.addApiStage({
            api: restApi,
            stage: restApi.deploymentStage
        })
    }
}
