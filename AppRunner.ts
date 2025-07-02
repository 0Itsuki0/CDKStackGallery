import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecrAsset from 'aws-cdk-lib/aws-ecr-assets'
import * as apprunner from 'aws-cdk-lib/aws-apprunner'
import * as iam from 'aws-cdk-lib/aws-iam'


export class NextJsAppRunnerDemoStack extends cdk.Stack {
    private imageAsset: ecrAsset.DockerImageAsset
    private app: apprunner.CfnService
    private instanceRole: iam.Role
    private accessRole: iam.Role


    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.createAccessRole()
        this.buildAsset()
        this.buildAppRunnerService()
    }

    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-apprunner-service-authenticationconfiguration.html#cfn-apprunner-service-authenticationconfiguration-accessrolearn
    private createAccessRole() {
        this.instanceRole = new iam.Role(this, 'AppRunnerInstanceRole', {
            assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
        })
        this.instanceRole.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

        this.accessRole = new iam.Role(this, 'AppRunnerAccessRole', {
            assumedBy: new iam.ServicePrincipal('build.apprunner.amazonaws.com'),
        })
        this.accessRole.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)
    }

    private buildAsset() {
        this.imageAsset = new ecrAsset.DockerImageAsset(
            this,
            "nextJsAppRunnerDemoImageAsset", {
            directory: "nextjs-apprunner-demo"
        })
        this.imageAsset.repository.grantPull(this.accessRole)
    }


    private buildAppRunnerService() {
        this.app = new apprunner.CfnService(this, "nextJsAppRunnerDemoAppRunner", {
            // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-apprunner-service-sourceconfiguration.html#cfn-apprunner-service-sourceconfiguration-authenticationconfiguration
            sourceConfiguration: {
                imageRepository: {
                    imageIdentifier: this.imageAsset.imageUri,
                    imageRepositoryType: "ECR",
                    imageConfiguration: {
                        port: "8080"
                    }
                },
                autoDeploymentsEnabled: true,
                authenticationConfiguration: {
                    accessRoleArn: this.accessRole.roleArn
                }
            },
            instanceConfiguration: {
                instanceRoleArn: this.instanceRole.roleArn
            }
        })
        this.app.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)
    }

}
