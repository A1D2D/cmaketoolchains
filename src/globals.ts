
interface Profile {
   name: string; // Profile name (e.g., Debug)
   buildType: string; // CMAKE_BUILD_TYPE value
   toolchain: string; // Toolchain name to use
   generator: string; // CMake generator (e.g. Ninja, Unix Makefiles)
   cmakeOptions?: string[]; // Extra CMake command line options
   cacheVariables?: { [key: string]: string }; // CMake cache variables to define
   buildDirectory?: string; // Build output directory path
   buildOptions?: string; // Flags for the build step (e.g. -j 14)
   environment?: { [key: string]: string }; // Additional environment variables for the build
}

interface Toolchain {
   name: string; // Name of the toolchain
   toolsetFolder: string; // Path to the toolset folder
   cmake: string; // Path to the CMake executable
   buildTool: string; // Path to the build tool executable
   ccompiler: string; // Path to the C compiler executable
   cppcompiler: string; // Path to the C++ compiler executable
   debugger?: string
}

interface BuildTargets {
   name: string;
   artifacts: string[] | null;
}

export let toolchains: Toolchain[] = [];

export let profiles: Profile[] = [];

export let activeBuildDir: string | null = null;

export let avaliableTargets: BuildTargets[] | null = null;


export function setProfiles(newProfiles: Profile[]) {
   profiles = newProfiles; // Set new profiles
}

export function setToolchains(newToolchains: Toolchain[]) {
   toolchains = newToolchains; // Set new toolchains
}

export function setActiveBuildDir(newActiveBuildDir: string) {
   activeBuildDir = newActiveBuildDir;
}

export function setAvaliableTargets(newAvaliableTargets: BuildTargets[]) {
   avaliableTargets = newAvaliableTargets;
}

export function getToolchains() {
   return toolchains;
}

export function getProfiles() {
   return profiles;
}

export function getCurrentProfile() {
   return activeBuildDir;
}

export function getAvaliableTargets() {
   return avaliableTargets;
}

export { BuildTargets };