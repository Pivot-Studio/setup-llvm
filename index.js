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
            // install zstd
            await exec.exec("brew install zstd zlib ncurses")
            let libpath = await execute("brew --prefix zstd");
            core.exportVariable('LIBRARY_PATH', `${libpath}/lib`)
            // mkdir /opt/local/lib/
            await exec.exec(`sudo mkdir -p /opt/local/lib/`)
            // cp /opt/homebrew/opt/zstd/lib/* to /opt/local/lib/*
            await exec.exec(`sudo cp -r ${libpath}/lib/ /opt/local/lib/`)
            libpath = await execute("brew --prefix zlib");
            await exec.exec(`sudo cp -r ${libpath}/lib/ /opt/local/lib/`)
            libpath = await execute("brew --prefix ncurses");
            await exec.exec(`sudo cp -r ${libpath}/lib/ /opt/local/lib/`)


            const downloadUrl = "https://github.com/Pivot-Studio/setup-llvm/releases/download/18.1.2/llvm-18-darwin-aarch64.zip";
            core.info(`downloading LLVM from '${downloadUrl}'`)
            const downloadLocation = await tc.downloadTool(downloadUrl);

            core.info("Succesfully downloaded LLVM release, extracting...")
            const llvmPath = "/usr/local/bin/llvm";
            await exec.exec(`mkdir -p ${llvmPath}`);
            const unzipPath = await tc.extractZip(downloadLocation, llvmPath);
            core.addPath(`${unzipPath}/llvm-18/bin`)
            // chmod 777
            await exec.exec(`chmod -R 777 ${unzipPath}/llvm-18`)
            // test llvm-config
            await exec.exec(`${unzipPath}/llvm-18/bin/llvm-config --version`)
            core.exportVariable('LLVM_SYS_180_PREFIX', `${unzipPath}/llvm-18`)

            // append `${unzipPath}/llvm-18/lib` to DYLD_LIBRARY_PATH
            let dyldPath = `${unzipPath}/llvm-18/lib`;
            await exec.exec(`sudo cp -r ${unzipPath}/llvm-18/lib/ /usr/local/lib/`)
            // core.exportVariable('DYLD_LIBRARY_PATH', `${dyldPath}`)

        } else if (isWindows) {
            const downloadUrl = "https://github.com/Pivot-Studio/setup-llvm/releases/download/18.1.2/llvm-18.1.2-windows-x64-msvc17-mt.7z"
            core.info(`downloading LLVM from '${downloadUrl}'`)
            const downloadLocation = await tc.downloadTool(downloadUrl);

            core.info("Succesfully downloaded LLVM release, extracting...")
            const llvmPath = "C:\\llvm";
            const _7zPath = path.join(__dirname, '..', 'externals', '7zr.exe');
            let attempt = 1;
            while (true) {
                const args = [
                    "x", // extract
                    downloadLocation,
                    `-o${llvmPath}`
                ]
                const exit = await exec.exec(_7zPath, args);
                if (exit === 2 && attempt <= 4) {
                    attempt += 1;
                    console.error(`Error extracting LLVM release, retrying attempt #${attempt} after 1s..`)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                else if (exit !== 0) {
                    throw new Error("Could not extract LLVM and Clang binaries.");
                }
                else {
                    core.info("Succesfully extracted LLVM release")
                    break;
                }
            }

            core.addPath(`${llvmPath}\\bin`)
            core.exportVariable('LIBCLANG_PATH', `${llvmPath}\\bin`)
            // core.exportVariable('LLVM_SYS_160_PREFIX', `${llvmPath}`)
        } else {
            core.setFailed(`unsupported platform '${process.platform}'`)
        }
    } catch (error) {
        console.error(error.stack);
        core.setFailed(error.message);
    }
})();
