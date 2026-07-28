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
import { createElement, type ComponentType } from "react";

import { getExtension, type SageFileType } from "@/lib/file-upload";

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

function getImageIcon(title: string): ComponentType<TablerIconProps> {
  const extension = getExtension(title);
  if (extension === "jpg" || extension === "jpeg") return IconFileTypeJpg;
  if (extension === "png") return IconFileTypePng;
  if (extension === "gif") return IconGif;
  return IconPhoto;
}

/** Same icon mapping as `FileTypeIcon`, but keyed off a tab's `{ fileType, title }`
 * instead of a full `LibraryFile` — a preview tab may outlive the `LibraryFile`
 * it was opened from (e.g. after the file is removed). */
export function PreviewFileTypeIcon({
  fileType,
  title,
  className,
  size = ICON_SIZE,
}: {
  fileType: SageFileType;
  title: string;
  className?: string;
  size?: number;
}) {
  const Icon = fileType === "image" ? getImageIcon(title) : FILE_TYPE_ICONS[fileType];

  return createElement(Icon, {
    "aria-hidden": true,
    className: className ?? "shrink-0 text-muted-foreground",
    size,
    stroke: ICON_STROKE,
  });
}
