import React from 'react';
import DocCategoryGeneratedIndexPage from '@theme-original/DocCategoryGeneratedIndexPage';
import type DocCategoryGeneratedIndexPageType from '@theme/DocCategoryGeneratedIndexPage';
import type { WrapperProps } from '@docusaurus/types';
// highlight-add-line
import Comment from '@site/src/components/Comment';

type Props = WrapperProps<typeof DocCategoryGeneratedIndexPageType>;

export default function DocCategoryGeneratedIndexPageWrapper(props: Props): JSX.Element {
  return (
    <>
      <DocCategoryGeneratedIndexPage {...props} />
      {/* highlight-add-line */}
      <Comment />
    </>
  );
}
