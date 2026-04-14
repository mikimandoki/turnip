const platform = window.Capacitor?.getPlatform() ?? 'web';

/**
 * Share or download a file cross-platform.
 * On iOS: Web Share API. On Android: Filesystem + Share plugin. On web: anchor download.
 */
export async function shareFile(
  content: string,
  filename: string,
  mimeType: string,
  shareTitle: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (platform === 'ios') {
      const file = new File([content], filename, { type: mimeType });
      await navigator.share({ files: [file] });
    } else if (platform === 'android') {
      const { Directory, Encoding, Filesystem } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
      await Share.share({ title: shareTitle, url: uri });
    } else {
      const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    return { success: true };
  } catch (e) {
    if (e instanceof Error && (e.name === 'AbortError' || e.message === 'Share canceled'))
      return { success: true };
    return { success: false, error: `Failed to share ${filename}` };
  }
}
