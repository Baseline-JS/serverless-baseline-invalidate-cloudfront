class CloudfrontInvalidate {
  serverless: any;
  options: any;
  provider: string;
  aws: any;
  commands: {
    cloudfrontInvalidate: {
      usage: string;
      lifecycleEvents: string[];
    };
  };
  hooks: {
    "cloudfrontInvalidate:invalidate": () => void;
    "after:deploy:deploy": () => void;
  };

  constructor(serverless: any, options: any) {
    this.serverless = serverless;
    this.options = options || {};
    this.provider = "aws";
    this.aws = this.serverless.getProvider("aws");

    this.commands = {
      cloudfrontInvalidate: {
        usage: "Invalidate Cloudfront Cache",
        lifecycleEvents: ["invalidate"],
      },
    };

    this.hooks = {
      "cloudfrontInvalidate:invalidate": this.invalidate.bind(this),
      "after:deploy:deploy": this.afterDeploy.bind(this),
    };
  }

  createInvalidation(
    distributionId: string,
    reference: string,
    cloudfrontInvalidate: any
  ) {
    const cli = this.serverless.cli;
    const cloudfrontInvalidateItems = cloudfrontInvalidate.items;

    const params = {
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: reference,
        Paths: {
          Quantity: cloudfrontInvalidateItems.length,
          Items: cloudfrontInvalidateItems,
        },
      },
    };
    return this.aws.request("CloudFront", "createInvalidation", params).then(
      () => {
        cli.consoleLog(`CloudfrontInvalidate: Invalidation started`);
      },
      (err: any) => {
        cli.consoleLog(JSON.stringify(err));
        cli.consoleLog(`CloudfrontInvalidate: Invalidation failed`);
        throw err;
      }
    );
  }

  invalidateElements(elements: any[]) {
    const cli = this.serverless.cli;

    if (this.options.noDeploy) {
      cli.consoleLog("skipping invalidation due to noDeploy option");
      return;
    }

    const invalidationPromises = elements.map((element) => {
      let cloudfrontInvalidate = element;
      let reference = Date.now().toString();
      let distributionId = cloudfrontInvalidate.distributionId;
      let stage = cloudfrontInvalidate.stage;

      if (
        stage !== undefined &&
        stage !== `${this.serverless.service.provider.stage}`
      ) {
        return;
      }

      if (distributionId) {
        cli.consoleLog(`DistributionId: ${distributionId}`);

        return this.createInvalidation(
          distributionId,
          reference,
          cloudfrontInvalidate
        );
      }

      if (!cloudfrontInvalidate.distributionIdKey) {
        cli.consoleLog("distributionId or distributionIdKey is required");
        return;
      }

      cli.consoleLog(
        `DistributionIdKey: ${cloudfrontInvalidate.distributionIdKey}`
      );

      const stackName = this.serverless
        .getProvider("aws")
        .naming.getStackName();

      return this.aws
        .request("CloudFormation", "describeStacks", { StackName: stackName })
        .then((result: any) => {
          if (result) {
            const outputs = result.Stacks[0].Outputs;
            outputs.forEach((output: any) => {
              if (output.OutputKey === cloudfrontInvalidate.distributionIdKey) {
                distributionId = output.OutputValue;
              }
            });
          }
        })
        .then(() =>
          this.createInvalidation(
            distributionId,
            reference,
            cloudfrontInvalidate
          )
        )
        .catch(() => {
          cli.consoleLog(
            "Failed to get DistributionId from stack output. Please check your serverless template."
          );
        });
    });

    return Promise.all(invalidationPromises);
  }

  afterDeploy() {
    const elementsToInvalidate =
      this.serverless.service.custom.cloudfrontInvalidate.filter(
        (element: any) => {
          if (element.autoInvalidate !== false) {
            return true;
          }

          this.serverless.cli.consoleLog(
            `Will skip invalidation for the distributionId "${
              element.distributionId || element.distributionIdKey
            }" as autoInvalidate is set to false.`
          );
          return false;
        }
      );

    return this.invalidateElements(elementsToInvalidate);
  }

  invalidate() {
    return this.invalidateElements(
      this.serverless.service.custom.cloudfrontInvalidate
    );
  }
}

module.exports = CloudfrontInvalidate;
