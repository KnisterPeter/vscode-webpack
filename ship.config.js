module.exports = {
  mergeStrategy: { toSameBranch: ["master"] },
  buildCommand: ({}) => "yarn vscode:prepublish",
  publishCommand: () => "yarn publish-extension",
};
