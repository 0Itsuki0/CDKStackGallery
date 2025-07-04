import { join } from 'path';
import { RustFunction } from 'cargo-lambda-cdk';
import { EndpointType, LambdaRestApi } from 'aws-cdk-lib/aws-apigateway'
import { CfnOutput, Duration, RemovalPolicy, Size, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_cognito, aws_apigateway } from "aws-cdk-lib";

export class CognitoAPIGatewayDemoStack extends Stack {

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        // trigger handler
        const triggerLambda = new RustFunction(this, 'CognitoDemoTriggerLambda', {
            // Path to the root directory.
            manifestPath: join(__dirname, '..', '..', 'trigger_lambda/'),
            timeout: Duration.minutes(5)
        });

        // cognito
        const userPool = new aws_cognito.UserPool(this, "CognitoDemoPool", {
            userPoolName: "CognitoDemoPool",
            selfSignUpEnabled: true,
            userVerification: {
                emailSubject: "Verify your email",
                emailBody: "Thanks for signing up! Your verification code is {####}",
                emailStyle: aws_cognito.VerificationEmailStyle.CODE,
            },
            autoVerify: {
                email: true,
                phone: false
            },
            mfa: aws_cognito.Mfa.OFF,
            signInAliases: {
                username: false,
                email: true,
                phone: false
            },
            // Choose the standard and custom attributes this app can read and write.
            // Required attributes are locked as writable.
            // We recommend that you set immutable custom attributes as writable to allow the app client to set initial values during sign-up.
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true
                },
                fullname: {
                    required: true,
                    mutable: true
                }
            },
            keepOriginal: {
                email: true
            },
            accountRecovery: aws_cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: RemovalPolicy.DESTROY,
            // passwordPolicy
            // advancedSecurityMode
            lambdaTriggers: {
                postConfirmation: triggerLambda
            }
        })

        // IDP like Apple, facebook, and etc. can be added here.
        // userPool.registerIdentityProvider(aws_cognito.UserPoolIdentityProvider.fromProviderName(this, "CognitoDemoAppleProvider", aws_cognito.UserPoolClientIdentityProvider.APPLE.name))

        const userPoolClient = userPool.addClient("CognitoDemoClient", {
            userPoolClientName: "CognitoDemoClient",
            authFlows: {
                userSrp: true
            },
            disableOAuth: false,
            oAuth: {
                callbackUrls: ["http://localhost:3000/auth/callback"],
                logoutUrls: ["http://localhost:3000"],
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [aws_cognito.OAuthScope.OPENID, aws_cognito.OAuthScope.EMAIL],
            },
            authSessionValidity: Duration.minutes(3),
            refreshTokenValidity: Duration.days(5),
            accessTokenValidity: Duration.minutes(60),
            idTokenValidity: Duration.minutes(60),
            enableTokenRevocation: true,
            preventUserExistenceErrors: true,
            // IDP like Apple, facebook, and etc. can be added here.
            // Default to all identify providers defined on the pool
            supportedIdentityProviders: [aws_cognito.UserPoolClientIdentityProvider.COGNITO]
        })

        // managed login not supported
        // userPool.addDomain("CognitoDemoDomain", {
        //     cognitoDomain: {
        //         domainPrefix: "itsukidemo",
        //     },
        // });

        const cfnUserPoolDomain = new aws_cognito.CfnUserPoolDomain(this, 'CognitoDemoManagedLoginDomain', {
            domain: `itsuki-demo-${process.env.CDK_DEFAULT_ACCOUNT}`,
            userPoolId: userPool.userPoolId,
            // * Version `1` is hosted UI (classic). Version `2` is the newer managed login with the branding designer.
            // For more information, see [Managed login](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-managed-login.html) .
            managedLoginVersion: 2
        });

        new aws_cognito.CfnManagedLoginBranding(this, 'CognitoDemoManagedLoginBranding', {
            userPoolId: userPool.userPoolId,
            clientId: userPoolClient.userPoolClientId,
            // true: applies the default branding style options.
            useCognitoProvidedValues: false,
            settings: {
                "components": {
                    "secondaryButton": {
                        "lightMode": {
                            "hover": {
                                "backgroundColor": "f2f8fdff",
                                "borderColor": "033160ff",
                                "textColor": "033160ff"
                            },
                            "defaults": {
                                "backgroundColor": "ffffffff",
                                "borderColor": "0972d3ff",
                                "textColor": "0972d3ff"
                            },
                            "active": {
                                "backgroundColor": "d3e7f9ff",
                                "borderColor": "033160ff",
                                "textColor": "033160ff"
                            }
                        },
                        "darkMode": {
                            "hover": {
                                "backgroundColor": "192534ff",
                                "borderColor": "89bdeeff",
                                "textColor": "89bdeeff"
                            },
                            "defaults": {
                                "backgroundColor": "0f1b2aff",
                                "borderColor": "ffffffff",
                                "textColor": "ffffffff"
                            },
                            "active": {
                                "backgroundColor": "354150ff",
                                "borderColor": "89bdeeff",
                                "textColor": "89bdeeff"
                            }
                        }
                    },
                    "form": {
                        "lightMode": {
                            "backgroundColor": "ffffffff",
                            "borderColor": "c6c6cdff"
                        },
                        "borderRadius": 8.0,
                        "backgroundImage": {
                            "enabled": false
                        },
                        "logo": {
                            "location": "CENTER",
                            "position": "TOP",
                            "enabled": false,
                            "formInclusion": "OUT"
                        },
                        "darkMode": {
                            "backgroundColor": "232323cc",
                            "borderColor": "232323cc"
                        }
                    },
                    "alert": {
                        "lightMode": {
                            "error": {
                                "backgroundColor": "fff7f7ff",
                                "borderColor": "d91515ff"
                            }
                        },
                        "borderRadius": 12.0,
                        "darkMode": {
                            "error": {
                                "backgroundColor": "1a0000ff",
                                "borderColor": "eb6f6fff"
                            }
                        }
                    },
                    "favicon": {
                        "enabledTypes": [
                            "ICO",
                            "SVG"
                        ]
                    },
                    "pageBackground": {
                        "image": {
                            "enabled": false
                        },
                        "lightMode": {
                            "color": "ffffffff"
                        },
                        "darkMode": {
                            "color": "000000cc"
                        }
                    },
                    "pageText": {
                        "lightMode": {
                            "bodyColor": "414d5cff",
                            "headingColor": "000716ff",
                            "descriptionColor": "414d5cff"
                        },
                        "darkMode": {
                            "bodyColor": "b6bec9ff",
                            "headingColor": "d1d5dbff",
                            "descriptionColor": "b6bec9ff"
                        }
                    },
                    "phoneNumberSelector": {
                        "displayType": "TEXT"
                    },
                    "primaryButton": {
                        "lightMode": {
                            "hover": {
                                "backgroundColor": "033160ff",
                                "textColor": "ffffffff"
                            },
                            "defaults": {
                                "backgroundColor": "0972d3ff",
                                "textColor": "ffffffff"
                            },
                            "active": {
                                "backgroundColor": "033160ff",
                                "textColor": "ffffffff"
                            },
                            "disabled": {
                                "backgroundColor": "ffffffff",
                                "borderColor": "ffffffff"
                            }
                        },
                        "darkMode": {
                            "hover": {
                                "backgroundColor": "89bdeeff",
                                "textColor": "000716ff"
                            },
                            "defaults": {
                                "backgroundColor": "ffffffff",
                                "textColor": "000716ff"
                            },
                            "active": {
                                "backgroundColor": "539fe5ff",
                                "textColor": "000716ff"
                            },
                            "disabled": {
                                "backgroundColor": "ffffffff",
                                "borderColor": "ffffffff"
                            }
                        }
                    },
                    "pageFooter": {
                        "lightMode": {
                            "borderColor": "d5dbdbff",
                            "background": {
                                "color": "fafafaff"
                            }
                        },
                        "backgroundImage": {
                            "enabled": false
                        },
                        "logo": {
                            "location": "START",
                            "enabled": false
                        },
                        "darkMode": {
                            "borderColor": "424650ff",
                            "background": {
                                "color": "0f141aff"
                            }
                        }
                    },
                    "pageHeader": {
                        "lightMode": {
                            "borderColor": "d5dbdbff",
                            "background": {
                                "color": "fafafaff"
                            }
                        },
                        "backgroundImage": {
                            "enabled": false
                        },
                        "logo": {
                            "location": "START",
                            "enabled": true
                        },
                        "darkMode": {
                            "borderColor": "424650ff",
                            "background": {
                                "color": "0f141aff"
                            }
                        }
                    },
                    "idpButton": {
                        "standard": {
                            "lightMode": {
                                "hover": {
                                    "backgroundColor": "f2f8fdff",
                                    "borderColor": "033160ff",
                                    "textColor": "033160ff"
                                },
                                "defaults": {
                                    "backgroundColor": "ffffffff",
                                    "borderColor": "424650ff",
                                    "textColor": "424650ff"
                                },
                                "active": {
                                    "backgroundColor": "d3e7f9ff",
                                    "borderColor": "033160ff",
                                    "textColor": "033160ff"
                                }
                            },
                            "darkMode": {
                                "hover": {
                                    "backgroundColor": "192534ff",
                                    "borderColor": "89bdeeff",
                                    "textColor": "89bdeeff"
                                },
                                "defaults": {
                                    "backgroundColor": "0f1b2aff",
                                    "borderColor": "c6c6cdff",
                                    "textColor": "c6c6cdff"
                                },
                                "active": {
                                    "backgroundColor": "354150ff",
                                    "borderColor": "89bdeeff",
                                    "textColor": "89bdeeff"
                                }
                            }
                        },
                        "custom": {}
                    }
                },
                "componentClasses": {
                    "dropDown": {
                        "lightMode": {
                            "hover": {
                                "itemBackgroundColor": "f4f4f4ff",
                                "itemBorderColor": "7d8998ff",
                                "itemTextColor": "000716ff"
                            },
                            "defaults": {
                                "itemBackgroundColor": "ffffffff"
                            },
                            "match": {
                                "itemBackgroundColor": "414d5cff",
                                "itemTextColor": "0972d3ff"
                            }
                        },
                        "borderRadius": 8.0,
                        "darkMode": {
                            "hover": {
                                "itemBackgroundColor": "081120ff",
                                "itemBorderColor": "5f6b7aff",
                                "itemTextColor": "e9ebedff"
                            },
                            "defaults": {
                                "itemBackgroundColor": "192534ff"
                            },
                            "match": {
                                "itemBackgroundColor": "d1d5dbff",
                                "itemTextColor": "89bdeeff"
                            }
                        }
                    },
                    "input": {
                        "lightMode": {
                            "defaults": {
                                "backgroundColor": "ffffffff",
                                "borderColor": "7d8998ff"
                            },
                            "placeholderColor": "5f6b7aff"
                        },
                        "borderRadius": 8.0,
                        "darkMode": {
                            "defaults": {
                                "backgroundColor": "0f1b2aff",
                                "borderColor": "5f6b7aff"
                            },
                            "placeholderColor": "8d99a8ff"
                        }
                    },
                    "inputDescription": {
                        "lightMode": {
                            "textColor": "5f6b7aff"
                        },
                        "darkMode": {
                            "textColor": "8d99a8ff"
                        }
                    },
                    "buttons": {
                        "borderRadius": 8.0
                    },
                    "optionControls": {
                        "lightMode": {
                            "defaults": {
                                "backgroundColor": "ffffffff",
                                "borderColor": "7d8998ff"
                            },
                            "selected": {
                                "backgroundColor": "0972d3ff",
                                "foregroundColor": "ffffffff"
                            }
                        },
                        "darkMode": {
                            "defaults": {
                                "backgroundColor": "0f1b2aff",
                                "borderColor": "7d8998ff"
                            },
                            "selected": {
                                "backgroundColor": "539fe5ff",
                                "foregroundColor": "000716ff"
                            }
                        }
                    },
                    "statusIndicator": {
                        "lightMode": {
                            "success": {
                                "backgroundColor": "f2fcf3ff",
                                "borderColor": "037f0cff",
                                "indicatorColor": "037f0cff"
                            },
                            "pending": {
                                "indicatorColor": "AAAAAAAA"
                            },
                            "warning": {
                                "backgroundColor": "fffce9ff",
                                "borderColor": "8d6605ff",
                                "indicatorColor": "8d6605ff"
                            },
                            "error": {
                                "backgroundColor": "fff7f7ff",
                                "borderColor": "d91515ff",
                                "indicatorColor": "d91515ff"
                            }
                        },
                        "darkMode": {
                            "success": {
                                "backgroundColor": "001a02ff",
                                "borderColor": "29ad32ff",
                                "indicatorColor": "29ad32ff"
                            },
                            "pending": {
                                "indicatorColor": "AAAAAAAA"
                            },
                            "warning": {
                                "backgroundColor": "1d1906ff",
                                "borderColor": "e0ca57ff",
                                "indicatorColor": "e0ca57ff"
                            },
                            "error": {
                                "backgroundColor": "1a0000ff",
                                "borderColor": "eb6f6fff",
                                "indicatorColor": "eb6f6fff"
                            }
                        }
                    },
                    "divider": {
                        "lightMode": {
                            "borderColor": "ebebf0ff"
                        },
                        "darkMode": {
                            "borderColor": "232b37ff"
                        }
                    },
                    "idpButtons": {
                        "icons": {
                            "enabled": true
                        }
                    },
                    "focusState": {
                        "lightMode": {
                            "borderColor": "0972d3ff"
                        },
                        "darkMode": {
                            "borderColor": "539fe5ff"
                        }
                    },
                    "inputLabel": {
                        "lightMode": {
                            "textColor": "000716ff"
                        },
                        "darkMode": {
                            "textColor": "d1d5dbff"
                        }
                    },
                    "link": {
                        "lightMode": {
                            "hover": {
                                "textColor": "033160ff"
                            },
                            "defaults": {
                                "textColor": "0972d3ff"
                            }
                        },
                        "darkMode": {
                            "hover": {
                                "textColor": "89bdeeff"
                            },
                            "defaults": {
                                "textColor": "539fe5ff"
                            }
                        }
                    }
                },
                "categories": {
                    "form": {
                        "sessionTimerDisplay": "NONE",
                        "instructions": {
                            "enabled": false
                        },
                        "languageSelector": {
                            "enabled": false
                        },
                        "displayGraphics": true,
                        "location": {
                            "horizontal": "CENTER",
                            "vertical": "CENTER"
                        }
                    },
                    "auth": {
                        "federation": {
                            "interfaceStyle": "BUTTON_LIST",
                            "order": []
                        },
                        "authMethodOrder": [
                            [
                                {
                                    "display": "BUTTON",
                                    "type": "FEDERATED"
                                },
                                {
                                    "display": "INPUT",
                                    "type": "USERNAME_PASSWORD"
                                }
                            ]
                        ]
                    },
                    "global": {
                        "colorSchemeMode": "DARK",
                        "pageHeader": {
                            "enabled": false
                        },
                        "pageFooter": {
                            "enabled": false
                        },
                        "spacingDensity": "REGULAR"
                    },
                    "signUp": {
                        "acceptanceElements": [
                            {
                                "enforcement": "NONE",
                                "textKey": "en"
                            }
                        ]
                    }
                }
            },
            assets: []
        })

        new CfnOutput(this, 'CognitoDemoDomainURL', {
            value: `https://${cfnUserPoolDomain.domain}.auth.${process.env.CDK_DEFAULT_REGION}.amazoncognito.com`
        })


        // apigateway lambda
        const apigatewayLambda = new RustFunction(this, 'CognitoDemoLambda', {
            // Path to the root directory.
            manifestPath: join(__dirname, '..', '..', 'gateway_lambda/'),
            timeout: Duration.minutes(5)
        });

        const cognitoAuthorizer = new aws_apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoDemoGatewayAuthorizer', {
            authorizerName: 'CognitoDemoGatewayAuthorizer',
            cognitoUserPools: [userPool],
            identitySource: aws_apigateway.IdentitySource.header("Authorization")
        });

        const restApi = new LambdaRestApi(this, 'CognitoDemoGateway', {
            handler: apigatewayLambda,
            endpointTypes: [EndpointType.REGIONAL],
            defaultMethodOptions: {
                authorizationType: aws_apigateway.AuthorizationType.COGNITO,
                authorizer: cognitoAuthorizer
            }
        });
        cognitoAuthorizer._attachToApi(restApi)

    }
}
