import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import { useLocation } from '@docusaurus/router';
import * as path from 'path-browserify';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

let extToLang = new Map([
  ["sh", "bash"],
  ["yml", "yaml"]
]);

export default function FileBlock({ file, showFileName, ...prop }: { file: string, showFileName?: boolean }) {
  // get url path without "/" prefix and suffix
  var urlPath = useLocation().pathname.replace(/^\/|\/$/g, '');

  // remove locale prefix in urlPath
  const { i18n } = useDocusaurusContext()
  if (i18n.currentLocale != i18n.defaultLocale) {
    urlPath = urlPath.replace(/^[^\/]*\/?/g, '')
  }

  // find file content according to topPath and file path param
  var filepath = ""
  if (file.startsWith("@site/")) {
    filepath = file.replace(/^@site\//g, '')
  } else {
    filepath = "codeblock/" + file
  }

  // load file raw content according to filepath
  var content = require('!!raw-loader!@site/' + filepath)?.default
  content = content.replace(/\t/g, "  "); // replace tab to 2 spaces

  // infer language of code block based on filename extension if language is not set
  const filename = path.basename(file);
  if (!prop.language) {
    var language = path.extname(filename).replace(/^\./, '')
    const langMappingName = extToLang.get(language)
    if (langMappingName) {
      language = langMappingName
    }
    prop.language = language
  }

  // set title to filename if showFileName is set and title is not set
  if (!prop.title && showFileName) {
    prop.title = filename
  }

  return (
    <CodeBlock {...prop}>
      {content}
    </CodeBlock>
  );
}

