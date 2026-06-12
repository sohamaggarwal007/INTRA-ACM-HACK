const vscode = require("vscode");

const breakingDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.5)",
    borderRadius: "2px",
    overviewRulerColor: "rgba(239, 68, 68, 0.8)",
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    after: {
        contentText: "  ⚠ Breaking change",
        color: "rgba(239, 68, 68, 0.8)",
        fontStyle: "italic",
    },
});

const deprecatedDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    border: "1px solid rgba(245, 158, 11, 0.5)",
    borderRadius: "2px",
    overviewRulerColor: "rgba(245, 158, 11, 0.8)",
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    after: {
        contentText: "  ⚡ Deprecated",
        color: "rgba(245, 158, 11, 0.8)",
        fontStyle: "italic",
    },
});

const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("deptrack");

async function highlightAffectedCode(changedAPIs) {
    if (!changedAPIs || changedAPIs.length === 0) return 0;

    // find all source files
    const files = await vscode.workspace.findFiles(
        "**/*.{js,jsx,ts,tsx}",
        "**/node_modules/**"
    );

    console.log(`DepTrack: scanning ${files.length} files`);

    const results = [];

    for (const fileUri of files) {
        const raw = await vscode.workspace.fs.readFile(fileUri);
        const content = Buffer.from(raw).toString("utf8");
        const lines = content.split("\n");

        lines.forEach((lineText, lineIndex) => {
            changedAPIs.forEach(({ name, type }) => {
                if (lineText.includes(name)) {
                    console.log(`DepTrack: found '${name}' in ${fileUri.fsPath} line ${lineIndex + 1}`);
                    results.push({
                        file: fileUri,
                        line: lineIndex,
                        api: name,
                        type: type,
                    });
                }
            });
        });
    }

    console.log(`DepTrack: total ${results.length} affected lines found`);

    if (results.length === 0) return 0;

    // group by file
    const byFile = {};
    results.forEach((r) => {
        const key = r.file.toString();
        if (!byFile[key]) byFile[key] = { uri: r.file, items: [] };
        byFile[key].items.push(r);
    });

    // apply to each file
    for (const key in byFile) {
        const { uri, items } = byFile[key];
        const doc = await vscode.workspace.openTextDocument(uri);

        const breakingRanges = [];
        const deprecatedRanges = [];
        const diagnostics = [];

        items.forEach(({ line, api, type }) => {
            const textLine = doc.lineAt(line);
            const range = new vscode.Range(
                line, 0,
                line, textLine.text.length
            );

            if (type === "breaking") breakingRanges.push(range);
            else deprecatedRanges.push(range);

            const severity =
                type === "breaking"
                    ? vscode.DiagnosticSeverity.Error
                    : vscode.DiagnosticSeverity.Warning;

            const diagnostic = new vscode.Diagnostic(
                range,
                `DepTrack: '${api}' has a ${type} change in the latest version`,
                severity
            );
            diagnostic.source = "DepTrack";
            diagnostics.push(diagnostic);
        });

        // KEY FIX — show document first, then apply decorations
        const editor = await vscode.window.showTextDocument(doc, {
            preserveFocus: true,
            preview: false,
        });

        editor.setDecorations(breakingDecoration, breakingRanges);
        editor.setDecorations(deprecatedDecoration, deprecatedRanges);

        diagnosticCollection.set(uri, diagnostics);
    }

    return results.length;
}

function clearHighlights() {
    diagnosticCollection.clear();
}

module.exports = { highlightAffectedCode, clearHighlights };