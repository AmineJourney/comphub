import { useEffect, useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { evidenceApi } from "../../api/evidence";
import {
  FileText,
  Download,
  ExternalLink,
  Image,
  FileCode,
  FileSpreadsheet,
} from "lucide-react";
import type { Evidence } from "../../types/evidence.types";
import { useI18n } from "../../hooks/useI18n";

interface EvidenceViewerProps {
  evidence: Evidence;
}

export function EvidenceViewer({ evidence }: EvidenceViewerProps) {
  const { t } = useI18n();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileActionError, setFileActionError] = useState<string | null>(null);
  const fileExtension = evidence.file_extension.toLowerCase();
  const previewable = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".svg",
    ".pdf",
  ].includes(fileExtension);
  const imageFile = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg"].includes(
    fileExtension,
  );
  const pdfFile = fileExtension === ".pdf";

  const getFileIcon = () => {
    if (imageFile) {
      return <Image className="h-12 w-12 text-blue-600" />;
    } else if (pdfFile) {
      return <FileText className="h-12 w-12 text-red-600" />;
    } else if ([".xls", ".xlsx", ".csv"].includes(fileExtension)) {
      return <FileSpreadsheet className="h-12 w-12 text-green-600" />;
    } else if (
      [".json", ".xml", ".yaml", ".txt", ".log", ".md"].includes(fileExtension)
    ) {
      return <FileCode className="h-12 w-12 text-purple-600" />;
    } else {
      return <FileText className="h-12 w-12 text-gray-600" />;
    }
  };

  useEffect(() => {
    let objectUrl: string | null = null;

    async function loadPreview() {
      if (!previewable) {
        setBlobUrl(null);
        return;
      }

      try {
        const blob = await evidenceApi.downloadEvidence(evidence.id);
        objectUrl = window.URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setFileActionError(null);
      } catch {
        setBlobUrl(null);
      }
    }

    loadPreview();

    return () => {
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [evidence.id, previewable]);

  const withDownloadedFile = async (
    callback: (objectUrl: string) => void,
    revokeDelayMs = 1_000,
  ) => {
    const blob = await evidenceApi.downloadEvidence(evidence.id);
    const objectUrl = window.URL.createObjectURL(blob);

    try {
      callback(objectUrl);
      setFileActionError(null);
    } finally {
      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, revokeDelayMs);
    }
  };

  const handleDownload = async () => {
    try {
      await withDownloadedFile((objectUrl) => {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = evidence.file_name ?? evidence.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    } catch {
      setFileActionError("Unable to download this file right now.");
    }
  };

  const handleOpenInNewTab = async () => {
    if (blobUrl) {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      await withDownloadedFile(
        (objectUrl) => {
          window.open(objectUrl, "_blank", "noopener,noreferrer");
        },
        60_000,
      );
    } catch {
      setFileActionError("Unable to open this file right now.");
    }
  };

  const renderPreview = () => {
    if (imageFile && blobUrl) {
      return (
        <div className="relative bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={blobUrl}
            alt={evidence.name}
            className="w-full h-auto max-h-[600px] object-contain"
          />
        </div>
      );
    }

    if (pdfFile && blobUrl) {
      return (
        <div className="relative bg-gray-100 rounded-lg overflow-hidden">
          <iframe
            src={blobUrl}
            className="w-full h-[600px] border-0"
            title={evidence.name}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <Card>
      <CardContent className="p-6">
        {previewable && blobUrl ? (
          <div className="space-y-4">
            {renderPreview()}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {t("evidence.viewer.previewWarning")}
              </p>
              <Button variant="outline" asChild>
                <a
                  href={blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("evidence.viewer.openNewTab")}
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="flex justify-center mb-4">{getFileIcon()}</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t("evidence.viewer.previewUnavailable")}
            </h3>
            <p className="text-gray-600 mb-6">
              {t("evidence.viewer.previewUnavailableBody")}
              <br />
              {t("evidence.viewer.downloadToView")}
            </p>
            {fileActionError && (
              <p className="mb-4 text-sm text-red-600">{fileActionError}</p>
            )}
            <div className="flex items-center justify-center gap-3">
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                {t("evidence.viewer.downloadFile")}
              </Button>
              <Button variant="outline" onClick={handleOpenInNewTab}>
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("evidence.viewer.openNewTab")}
              </Button>
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left max-w-md mx-auto">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                {t("evidence.viewer.fileInformation")}
              </h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">{t("evidence.typeLabel")}</dt>
                  <dd className="text-gray-900 font-medium">
                    {evidence.file_extension.toUpperCase()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">{t("evidence.viewer.sizeLabel")}</dt>
                  <dd className="text-gray-900 font-medium">
                    {evidence.file_size_display}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">{t("evidence.viewer.mimeTypeLabel")}</dt>
                  <dd className="text-gray-900 font-medium truncate max-w-[200px]">
                    {evidence.file_type || t("common.unknown")}
                  </dd>
                </div>
                {evidence.file_hash && (
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <dt className="text-gray-600">{t("evidence.viewer.sha256Label")}</dt>
                    <dd
                      className="text-gray-900 font-mono text-xs truncate max-w-[200px]"
                      title={evidence.file_hash}
                    >
                      {evidence.file_hash.substring(0, 16)}...
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
