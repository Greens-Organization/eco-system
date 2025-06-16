import { docs } from '@/.source';
import {
  type InferMetaType,
  type InferPageType,
  loader,
} from 'fumadocs-core/source';
import { attachFile } from 'fumadocs-openapi/server';
import { icons } from 'lucide-react';
import { createElement } from 'react';

// See https://fumadocs.vercel.app/docs/headless/source-api for more info
export const source = loader({
  baseUrl: '/docs',
  icon(icon) {
    if (icon && icon in icons) {
      return createElement(icons[icon as keyof typeof icons]);
    }
  },
  source: docs.toFumadocsSource(),
  pageTree: {
    attachFile,
  },
});

export type Page = InferPageType<typeof source>;
export type Meta = InferMetaType<typeof source>;
