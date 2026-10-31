// @astrojs/check and Volar need the TypeScript JS API, absent from TypeScript 7 (native compiler).
const NEEDS_TYPESCRIPT_6 = /^(@astrojs\/check|@astrojs\/language-server|@volar\/.+)$/;

const readPackage = (pkg) => {
  if (NEEDS_TYPESCRIPT_6.test(pkg.name) && pkg.peerDependencies?.typescript) {
    delete pkg.peerDependencies.typescript;
    pkg.dependencies = { ...pkg.dependencies, typescript: '^6.0.3' };
  }
  return pkg;
};

module.exports = { hooks: { readPackage } };
