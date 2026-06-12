async function getOutdatedPackages(dependencies) {
    const outdated = [];

    await Promise.all(
        Object.entries(dependencies).map(async ([name, installedRange]) => {
            try {
                const res = await fetch(`https://registry.npmjs.org/${name}`);
                if (!res.ok) return;
                const data = await res.json();

                const latest = data["dist-tags"].latest;
                const installed = installedRange.replace(/[\^~>=<]/g, "").trim();

                const installedMajor = parseInt(installed.split(".")[0]);
                const latestMajor = parseInt(latest.split(".")[0]);

                if (installed !== latest) {
                    outdated.push({
                        name,
                        installed,
                        latest,
                        isMajor: latestMajor > installedMajor,
                    });
                }
            } catch (e) {
                // skip failed fetches silently
            }
        })
    );

    return outdated;
}

// for now returns hardcoded known breaking APIs per package
// replace with real AI/changelog call later
function getChangedAPIs(packageName, fromVersion, toVersion) {
    const knownBreaking = {
        react: [
            { name: "ReactDOM.render", type: "breaking" },
            { name: "unmountComponentAtNode", type: "breaking" },
            { name: "componentWillMount", type: "deprecated" },
            { name: "componentWillReceiveProps", type: "deprecated" },
            { name: "componentWillUpdate", type: "deprecated" },
        ],
        axios: [
            { name: "axios.spread", type: "breaking" },
        ],
        "react-router-dom": [
            { name: "useHistory", type: "breaking" },
            { name: "Switch", type: "breaking" },
            { name: "Redirect", type: "breaking" },
        ],
    };

    return knownBreaking[packageName] || [];
}

module.exports = { getOutdatedPackages, getChangedAPIs };