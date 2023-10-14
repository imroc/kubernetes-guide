import React from 'react';
// Import the original mapper
import MDXComponents from '@theme-original/MDXComponents';

import FileBlock from '@site/src/components/FileBlock';
import CodeBlock from '@theme-original/CodeBlock';
import Tabs from '@theme-original/Tabs';
import TabItem from '@theme-original/TabItem';

export default {
  // Re-use the default mapping
  ...MDXComponents,
  // Add more components to be imported by default
  FileBlock,
  CodeBlock,
  Tabs,
  TabItem,
};
