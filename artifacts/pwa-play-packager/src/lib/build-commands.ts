import type { ProjectConfig, SigningConfig } from './types';

export function quoteShellArg(value: string, shell: 'bash' | 'powershell') {
  return shell === 'bash'
    ? `'${value.replaceAll("'", "'\"'\"'")}'`
    : `'${value.replaceAll("'", "''")}'`;
}

export function bashCodeBlock(command: string) {
  const longestRun = Math.max(0, ...(command.match(/`+/g) || []).map(run => run.length));
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  return `${fence}bash\n${command}\n${fence}`;
}

export function generateLocalBuildSteps(project: ProjectConfig, signing: SigningConfig) {
  const manifestUrl = project.manifestUrl || 'https://example.com/manifest.json';
  const keystore = signing.keystoreFilename || 'android.keystore';
  const alias = signing.keyAlias || 'android';
  return [
    {
      title: 'Review and install Bubblewrap CLI',
      description: 'Review the selected Bubblewrap version and its Node, JDK and Android SDK requirements before installing tools.',
      bash: 'npm install -g @bubblewrap/cli',
      powershell: 'npm install -g @bubblewrap/cli',
    },
    {
      title: 'Initialize and review the Android project locally',
      description: 'Initialization is interactive. Review the manifest, existing signing key and generated Android configuration before building or committing it.',
      bash: `bubblewrap init --manifest=${quoteShellArg(manifestUrl, 'bash')}`,
      powershell: `bubblewrap init --manifest=${quoteShellArg(manifestUrl, 'powershell')}`,
    },
    {
      title: 'Build the AAB',
      description: 'Use the reviewed twa-manifest.json signing configuration. Bubblewrap prompts for passwords; do not put password values in commands or project exports.',
      bash: 'bubblewrap build',
      powershell: 'bubblewrap build',
    },
    {
      title: 'Verify the output',
      description: 'A command template is not a successful Android build. Verify the nonempty signed bundle and test it on an owned device.',
      bash: 'test -s app-release-bundle.aab && ls -l app-release-bundle.aab',
      powershell: "$bundle = Get-Item -LiteralPath 'app-release-bundle.aab' -ErrorAction Stop; if ($bundle.Length -eq 0) { throw 'The bundle is empty' }; $bundle | Select-Object Name, Length",
    },
    {
      title: 'Inspect the existing signing key metadata',
      description: 'This reads metadata and can prompt for a password; it does not create a new key or re-sign the generated bundle.',
      bash: `keytool -list -v -keystore ${quoteShellArg(keystore, 'bash')} -alias ${quoteShellArg(alias, 'bash')}`,
      powershell: `keytool -list -v -keystore ${quoteShellArg(keystore, 'powershell')} -alias ${quoteShellArg(alias, 'powershell')}`,
    },
  ];
}
