const vscode = require("vscode");
const {getCompatibleFiles} = require('./compatible-files.js')

function startWatcher(analyzeDependency) {
    const watcher = vscode.workspace.createFileSystemWatcher(
        getCompatibleFiles()
    );

    let timer = null;

    const scheduleChange = () => {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            timer = null;
            console.log("dependency file change (debounced)");
            try {
                analyzeDependency();
            } catch (err) {
                console.error("Error in onDependencyChange:", err);
            }
        }, 1000);
    };

    watcher.onDidChange(scheduleChange);
    watcher.onDidCreate(scheduleChange);
    watcher.onDidDelete(scheduleChange);

    const origDispose = watcher.dispose && watcher.dispose.bind(watcher);
    watcher.dispose = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (origDispose) return origDispose();
    };

    return watcher;
}

module.exports = { startWatcher };
