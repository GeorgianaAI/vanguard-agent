type DownloadBlobArgs = {
  blob: Blob;
  filename: string;
};

export function downloadBlob({ blob, filename }: DownloadBlobArgs): void {
  const url = URL.createObjectURL(blob);

  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
