from aws_cdk import (
    Stack,
    aws_cloudfront, 
    aws_cloudfront_origins,
    aws_s3, 
    RemovalPolicy, 
    aws_iam, Duration
)
from constructs import Construct

class CloudfrontS3InvalidationLambdaDemoStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        self.create_s3_bucket()
        self.create_cloudfront_distribution()
        self.configure_s3_bucket()
        self.created_lambda()

  
    def create_s3_bucket(self): 
        self.bucket = aws_s3.Bucket(
            scope=self, 
            id="cdkCloudfronts3DemoBucket", 
            bucket_name="cdk-cloudfront-s3-demo-bucket", 
            block_public_access=aws_s3.BlockPublicAccess.BLOCK_ALL
        )
        self.bucket.apply_removal_policy(RemovalPolicy.DESTROY)

        
    def create_cloudfront_distribution(self):     
        distribution = aws_cloudfront.Distribution(
            scope=self, 
            id="cdkCloudfronts3DemoDistribution", 
            default_behavior = aws_cloudfront.BehaviorOptions(
                origin=aws_cloudfront_origins.S3Origin(
                    bucket=self.bucket, 
                    origin_access_identity=None
                ), 
                allowed_methods=aws_cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cached_methods=aws_cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                compress=True,
                cache_policy=aws_cloudfront.CachePolicy.CACHING_OPTIMIZED,
                response_headers_policy=aws_cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
                viewer_protocol_policy=aws_cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
                origin_request_policy=aws_cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN
            ), 
            enable_ipv6=True,
            http_version=aws_cloudfront.HttpVersion.HTTP2_AND_3,
            price_class=aws_cloudfront.PriceClass.PRICE_CLASS_200, 
            enabled=True,
            error_responses=[
                aws_cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=403,
                    response_page_path="/errors/403.json",
                    ttl=Duration.seconds(300)
                ),
                aws_cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=404,
                    response_page_path="/errors/404.json",
                    ttl=Duration.seconds(300)
                )  
            ]
        )
        
        distribution.apply_removal_policy(RemovalPolicy.DESTROY)
        
        origin_acess_control = aws_cloudfront.CfnOriginAccessControl(
            scope=self, 
            id="cdkCloudfronts3DemoOAC", 
            origin_access_control_config=aws_cloudfront.CfnOriginAccessControl.OriginAccessControlConfigProperty(
                name="cdkCloudfronts3DemoOAC", 
                origin_access_control_origin_type="s3",
                signing_behavior="always",
                signing_protocol="sigv4"
            )
        )
        origin_acess_control.apply_removal_policy(RemovalPolicy.DESTROY)
        
        cfn_distribution: aws_cloudfront.CfnDistribution = distribution.node.default_child
        # Delete OAI: automatically created by default
        cfn_distribution.add_property_override('DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity', '')
        # Set OAC
        cfn_distribution.add_property_override('DistributionConfig.Origins.0.OriginAccessControlId', origin_acess_control.attr_id)
        cfn_distribution.apply_removal_policy(RemovalPolicy.DESTROY)
        
        self.distribution = distribution
        self.cfn_distribution = cfn_distribution


    def configure_s3_bucket(self):        
        
        bucket_policy_statement = aws_iam.PolicyStatement.from_json({
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": ["s3:GetObject"],
            "Resource": [
                f"{self.bucket.bucket_arn}/*",
            ]
        })
        bucket_policy_statement.add_condition(
            "StringEquals", {
                    "AWS:SourceArn": f"arn:aws:cloudfront::075198889659:distribution/{self.cfn_distribution.attr_id}"
                }
        )
        
        self.bucket_policy = aws_s3.CfnBucketPolicy(
            scope=self, 
            id="cdkCloudfronts3DemoBucketPolicy", 
            bucket=self.bucket.bucket_name, 
            policy_document=aws_iam.PolicyDocument(
                statements=[bucket_policy_statement]
            )
        )
                
        self.bucket.add_cors_rule(
            allowed_methods=[aws_s3.HttpMethods.GET, aws_s3.HttpMethods.HEAD],
            allowed_headers=["*"],
            allowed_origins=["*"],
            exposed_headers=[]
        )

  
    def created_lambda(self): 
        self.lambda_function = aws_lambda.Function(
            scope=self, 
            id="LambdaInvalidationDemoLambda", 
            function_name="LambdaInvalidationDemoLambda", 
            code=aws_lambda.Code.from_asset(
                path="lambda"
            ), 
            handler="handler.handler", 
            runtime=aws_lambda.Runtime.PYTHON_3_11, 
            timeout=Duration.minutes(2), 
            environment={
                "DISTRIBUTION_ID": self.cfn_distribution.attr_id
            }
        )

      self.lambda_function.add_to_role_policy(aws_iam.PolicyStatement(
          effect=aws_iam.Effect.ALLOW, 
          actions=[
              'cloudFront:CreateInvalidation', 
          ], 
          resources=[
              f"arn:aws:cloudfront::{cdk.Aws.ACCOUNT_ID}:distribution/{self.cfn_distribution.attr_id}"
          ]
      ))

      self.lambda_function.add_event_source(
          source=aws_lambda_event_sources.S3EventSource(
              bucket=self.bucket,
              events=[aws_s3.EventType.OBJECT_CREATED]
          )
      )





      
                
