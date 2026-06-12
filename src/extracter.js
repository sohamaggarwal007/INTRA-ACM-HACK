const path = require("path");
const vscode = require("vscode");
const { getCompatibleFiles } = require("./compatible-files.js"); 

const DEPENDENCY_FILES = {
    node: ["package.json"],
    python: ["requirements.txt", "pyproject.toml"],
    java: ["pom.xml", "build.gradle"],
    rust: ["Cargo.toml"],
    go: ["go.mod"],
};

const getdependencies = async () => {
    const files = await vscode.workspace.findFiles(
        getCompatibleFiles()
    );

    if (files.length === 0) {
        return [];
    }


    const dependency = await Promise.all(
        files.map(async (file) => {
            let fileType;
            
            for(const [type, files] of Object.entries(DEPENDENCY_FILES)){
                if(files.includes(path.basename(file.fsPath))){
                    fileType = type
                }
            }

            const content = await vscode.workspace.fs.readFile(file);

            let payload= {
                type:fileType,
                path: file.fsPath,
                content: Buffer.from(content).toString('utf-8')
            }
            if(payload.type === 'node'){
                const apparentContent = JSON.parse(payload.content)
                const realContent = {
                    'dependencies':apparentContent.dependencies || {},
                    "devDependencies":apparentContent.devDependencies || {},
                }
                payload.content = realContent;
            }
            return payload;

        })
    );

    return dependency;
}

module.exports = { getdependencies };