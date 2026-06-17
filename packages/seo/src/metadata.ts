import { merge } from 'es-toolkit/object';

export interface SeoImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface SeoOpenGraph {
  title: string;
  description: string;
  type?: string;
  siteName?: string;
  locale?: string;
  images?: SeoImage[];
}

export interface SeoMetadata {
  title: string;
  description: string;
  applicationName?: string;
  authors?: Array<{ name: string; url?: string }>;
  creator?: string;
  publisher?: string;
  robots?: string;
  openGraph?: SeoOpenGraph;
  [key: string]: unknown;
}

type MetadataGenerator = {
  title: string;
  description: string;
  image?: string;
  [key: string]: unknown;
};

const applicationName = 'eco-system';
const author = { name: 'GRN Group', url: 'https://g.grngroup.net/' };
const publisher = 'GRN Group';

export const createMetadata = ({
  title,
  description,
  image,
  ...properties
}: MetadataGenerator): SeoMetadata => {
  const parsedTitle = `${title} | ${applicationName}`;

  const defaultMetadata: SeoMetadata = {
    title: parsedTitle,
    description,
    applicationName,
    authors: [author],
    creator: author.name,
    publisher,
    openGraph: {
      title: parsedTitle,
      description,
      type: 'website',
      siteName: applicationName,
      locale: 'en_US',
    },
  };

  const metadata: SeoMetadata = merge(
    defaultMetadata,
    properties as SeoMetadata
  );

  if (image && metadata.openGraph) {
    metadata.openGraph.images = [
      { url: image, width: 1200, height: 630, alt: title },
    ];
  }

  return metadata;
};
