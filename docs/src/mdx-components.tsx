import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as StepsComponents from 'fumadocs-ui/components/steps';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';
import { Authors } from './components/mdx/authors';
import { VercelButton } from './components/mdx/vercel';
import { Callout } from 'fumadocs-ui/components/callout';
import { Mermaid } from './components/mdx/mermaid';

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...components,
    ...TabsComponents,
    ...StepsComponents,
    Authors,
    VercelButton,
    Warning: ({ children }) => <Callout type="warning">{children}</Callout>,
    Tip: ({ children }) => <Callout type="info">{children}</Callout>,
    Info: ({ children }) => <Callout type="info">{children}</Callout>,
    Note: ({ children }) => <Callout type="info">{children}</Callout>,
    Mermaid
  };
}
