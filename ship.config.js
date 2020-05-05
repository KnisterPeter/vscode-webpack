module.exports = {
  mergeStrategy: { toSameBranch: ["master"] },
  publishCommand: () => "yarn publish-extension",
};
