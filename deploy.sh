#!/bin/bash
# 極簡部署腳本 - AWS App Runner
set -e

echo "🚀 Deploying Simple OpenAI Realtime Proxy to AWS App Runner..."

# 檢查必要環境變數
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY environment variable is required"
    echo "Usage: OPENAI_API_KEY=your-key ./deploy.sh"
    exit 1
fi

# 檢查 AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# 生成服務名稱
SERVICE_NAME="simple-openai-realtime-proxy"
REPO_URL="https://github.com/your-username/silent-operator"

echo "📦 Creating App Runner service: $SERVICE_NAME"

# 創建 App Runner 服務
aws apprunner create-service \
    --service-name "$SERVICE_NAME" \
    --source-configuration '{
        "AutoDeploymentsEnabled": false,
        "CodeRepository": {
            "RepositoryUrl": "https://github.com/placeholder/repo",
            "SourceCodeVersion": {
                "Type": "BRANCH",
                "Value": "main"
            },
            "CodeConfiguration": {
                "ConfigurationSource": "API",
                "CodeConfigurationValues": {
                    "Runtime": "NODEJS_18",
                    "BuildCommand": "npm install",
                    "StartCommand": "node server.js",
                    "Port": "8080",
                    "RuntimeEnvironmentVariables": {
                        "OPENAI_API_KEY": "'$OPENAI_API_KEY'",
                        "COGNITO_USER_POOL_ID": "ap-southeast-1_UwCmj5RYY",
                        "COGNITO_CLIENT_ID": "2ju0hh9llp0p3lkeoeom7r0co2",
                        "COGNITO_REGION": "ap-southeast-1",
                        "NODE_ENV": "production",
                        "SERVICE_VERSION": "1.0.0"
                    }
                }
            }
        }
    }' \
    --instance-configuration '{
        "Cpu": "0.25 vCPU",
        "Memory": "0.5 GB"
    }' \
    --health-check-configuration '{
        "Protocol": "HTTP",
        "Path": "/health",
        "Interval": 10,
        "Timeout": 5,
        "HealthyThreshold": 1,
        "UnhealthyThreshold": 5
    }' \
    --region ap-southeast-1 || {
        echo "❌ Service creation failed. It might already exist."
        echo "💡 To update existing service, use: aws apprunner update-service"
        exit 1
    }

echo "⏳ Service creation started. Checking status..."

# 等待服務創建完成
echo "📊 You can check the deployment status with:"
echo "   aws apprunner describe-service --service-arn \$(aws apprunner list-services --query 'ServiceSummaryList[?ServiceName==\`$SERVICE_NAME\`].ServiceArn' --output text) --region ap-southeast-1"

echo ""
echo "🎯 Next steps:"
echo "   1. Wait for the service to be ready (check AWS Console)"
echo "   2. Get the service URL from the AWS Console"
echo "   3. Test with: wscat -c 'wss://your-service-url.awsapprunner.com/realtime?token=JWT_TOKEN'"
echo "   4. Monitor logs: aws logs tail /aws/apprunner/$SERVICE_NAME --region ap-southeast-1 --follow"

echo "✅ Deployment script completed!"