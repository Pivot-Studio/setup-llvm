const core = require('@actions/core');
const exec = require('@actions/exec');
const tc = require('@actions/tool-cache');
const path = require('path');

const isWindows = process.platform == "win32"
const isMacOS = process.platform == "darwin"
const isLinux = process.platform == "linux"

export async function execute(cmd) {
    let myOutput = '';
    let myError = '';
    await exec.exec(cmd, [], {
        listeners: {
            stdout: (data) => {
                myOutput += data.toString().trim();
            },
            stderr: (data) => {
                myError += data.toString().trim();
            }
        }
    });

    if (myError) {
        throw new Error(myError);
    }
    return myOutput;
}

(async () => {
    try {
        if (isLinux) {
            const installScript = path.join(__dirname, "../scripts/install_llvm.sh");
            await exec.exec(`sudo ${installScript}`);
        } else if (isMacOS) {
            let libpath = await execute("brew --prefix zstd");
            core.exportVariable('LIBRARY_PATH', `${libpath}/lib`)

            await exec.exec("sudo port install llvm-18")
            let llvmPath = await execute("port contents llvm-18 | grep bin | head -n 1")
            core.addPath(llvmPath)

            

            // core.exportVariable('LLVM_SYS_160_PREFIX', `${llvmPath}`)
        } else if (isWindows) {
            const downloadUrl = "https://github.com/llvm/llvm-project/releases/download/llvmorg-18.1.0/clang+llvm-18.1.0-x86_64-pc-windows-msvc.tar.xz"
            core.info(`downloading LLVM from '${downloadUrl}'`)
            const downloadLocation = await tc.downloadTool(downloadUrl);

            // extract package
            const llvmPath = await tc.extractTar(downloadLocation);
            core.addPath(`${llvmPath}\\bin`)
            core.exportVariable('LIBCLANG_PATH', `${llvmPath}\\bin`)
            // core.exportVariable('LLVM_SYS_180_PREFIX', `${llvmPath}`)
        } else {
            core.setFailed(`unsupported platform '${process.platform}'`)
        }
    } catch (error) {
        console.error(error.stack);
        core.setFailed(error.message);
    }
})();
