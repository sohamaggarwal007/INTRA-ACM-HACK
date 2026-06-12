const vscode = require("vscode");
const { startWatcher } = require("./dependency-watcher.js");
const { getdependencies } = require("./extracter.js");
const { highlightAffectedCode, clearHighlights } = require("./highlighter.js"); 
const { getOutdatedPackages, getChangedAPIs } = require("./npm-checker.js");

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	console.log('DepTrack is now Active');
	await runAnalysis();

	const watcher = startWatcher(async () => {
		vscode.window.showInformationMessage("DepTrack: Analysing dependencies...");
		await runAnalysis();
	});

	const disposable = vscode.commands.registerCommand(
		"test-extn.helloWorld",
		async () => {
			await runAnalysis();
		},
	);

	context.subscriptions.push(disposable, watcher);
}

async function runAnalysis() {
    const dependencies = await getdependencies();
    if (!dependencies.length) return;

    // get node deps only for now
    const nodeDep = dependencies.find(d => d.type === "node");
    if (!nodeDep) return;

    const allDeps = {
        ...nodeDep.content.dependencies,
        ...nodeDep.content.devDependencies,
    };

    // find outdated packages
    const outdated = await getOutdatedPackages(allDeps);
    if (!outdated.length) {
        vscode.window.showInformationMessage("DepTrack: All packages up to date");
        return;
    }

    vscode.window.showWarningMessage(
        `DepTrack: ${outdated.length} outdated package(s) found`
    );

    // collect all changed APIs across all outdated packages
    const allChangedAPIs = [];
    outdated.forEach(({ name, installed, latest }) => {
        const apis = getChangedAPIs(name, installed, latest);
        allChangedAPIs.push(...apis);
    });

    // highlight affected lines
    if (allChangedAPIs.length > 0) {
        const count = await highlightAffectedCode(allChangedAPIs);
        if (count > 0) {
            vscode.window.showErrorMessage(
                `DepTrack: ${count} affected line(s) found — check Problems panel`
            );
        }
    }
}

function deactivate() {
	clearHighlights();
 }

module.exports = {
	activate,
	deactivate,
};
