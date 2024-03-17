# serverless-baseline-invalidate-cloudfront

Serverless plugin that allows you to invalidate Cloudfront Cache securely, addressing previous security concerns with the vm2 dependency. Based on the original package `serverless-cloudfront-invalidate`.

## Install

Install the updated plugin in your Serverless project.

```sh
$ npm install --save serverless-baseline-invalidate-cloudfront
```

## Setup

Incorporate the plugin into your serverless.yml file as the final plugin.

```yaml
plugins:
  - serverless-baseline-invalidate-cloudfront # Add this as the last plugin.
```

For CloudFront distributions created within the same serverless.yml, you can specify the `distributionIdKey` and output the DomainId (as illustrated below).

```yaml
custom:
  cloudfrontInvalidate:
    - distributionId: "CLOUDFRONT_DIST_ID" # Either distributionId or distributionIdKey is required.
      distributionIdKey: "CDNDistributionId" # Either distributionId or distributionIdKey is required.
      autoInvalidate: true # Set to false to prevent automatic invalidation post-deployment. Defaults to true.
      items: # Specify one or more paths
        - "/index.html"
      stage:
        "staging" # Specify the deployment stage for this invalidation
        # This should align with the provider's stage, e.g., "staging" instead of "prod"
        # Invalidation for this distribution will be initiated with `sls deploy --stage staging`
    - distributionId: "CLOUDFRONT_DIST_ID" # Either distributionId or distributionIdKey is required.
      distributionIdKey: "CDNDistributionId" # Either distributionId or distributionIdKey is required.
      items: # Specify one or more paths
        - "/index.html"
      # Omitting `stage` will trigger invalidation for this distribution across all stages
resources:
  Resources:
    CDN:
      Type: "AWS::CloudFront::Distribution"
      Properties: ....
  Outputs:
    CDNDistributionId:
      Description: "CDN distribution id."
      Value:
        Ref: CDN
```

## Usage

Execute `sls deploy`. Post-deployment, CloudFront Invalidation will commence.
To trigger a standalone invalidation, run `sls cloudfrontInvalidate`.
