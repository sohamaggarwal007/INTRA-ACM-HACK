function getCompatibleFiles() {
	const DEPENDENCY_FILES = {
		node: ["package.json"],
		python: ["requirements.txt", "pyproject.toml"],
		java: ["pom.xml", "build.gradle"],
		rust: ["Cargo.toml"],
		go: ["go.mod"],
	};

	const filename = Object.values(DEPENDENCY_FILES).flat().join(",");

	return `**/{${filename}}`;
}

module.exports = {getCompatibleFiles};