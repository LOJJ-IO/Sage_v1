import {
  IconFileTypeDocx,
  IconFileTypeJpg,
  IconFileTypePdf,
  IconFileTypePng,
  IconFileTypeTxt,
  IconGif,
  IconMarkdown,
  IconPhoto,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

import {
  getExtension,
  type LibraryFile,
  type SageFileType,
} from "@/lib/file-upload";

const ICON_SIZE = 16;
const ICON_STROKE = 2.2;

type TablerIconProps = {
  size?: number;
  stroke?: number;
  className?: string;
  "aria-hidden"?: boolean;
};

const FILE_TYPE_ICONS: Record<
  Exclude<SageFileType, "image">,
  ComponentType<TablerIconProps>
> = {
  pdf: IconFileTypePdf,
  docx: IconFileTypeDocx,
  txt: IconFileTypeTxt,
  md: IconMarkdown,
};

function getImageIcon(filename: string): ComponentType<TablerIconProps> {
  const extension = getExtension(filename);
  if (extension === "jpg" || extension === "jpeg") return IconFileTypeJpg;
  if (extension === "png") return IconFileTypePng;
  if (extension === "gif") return IconGif;
  return IconPhoto;
}

export function FileTypeIcon({ entry }: { entry: LibraryFile }) {
  const Icon =
    entry.fileType === "image"
      ? getImageIcon(entry.file.name)
      : FILE_TYPE_ICONS[entry.fileType];

  return (
    <Icon
      aria-hidden
      className="shrink-0 text-muted-foreground"
      size={ICON_SIZE}
      stroke={ICON_STROKE}
    />
  );
}
